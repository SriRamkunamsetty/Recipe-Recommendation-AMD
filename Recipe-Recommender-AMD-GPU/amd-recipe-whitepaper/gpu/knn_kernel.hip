/**
 * knn_kernel.hip
 * 
 * AMD GPU (HIP/ROCm) Kernel for Smart Recipe Recommender
 * Accelerated K-Nearest Neighbors Distance Computation
 * 
 * Target: AMD Instinct MI300X (gfx942) | ROCm 6.x
 * Author: MOHAN SRIRAM
 */

#include <hip/hip_runtime.h>
#include <math.h>
#include <stdio.h>

#define BLOCK_SIZE 256
#define MAX_RECIPES 200000

// ─── Kernel 1: Weighted Euclidean Distance (KNN Core) ────────────────────────
/**
 * Each GPU thread computes the weighted KNN distance for one recipe.
 * 
 * Distance formula:
 *   d = sqrt((cal_d×2)² + (diet_d)² + (ing_d×10)²) - rating_bonus
 * 
 * Grid: (ceil(n_recipes / 256), 1, 1)
 * Block: (256, 1, 1)
 * Threads: 1 thread = 1 recipe distance calculation
 */
__global__ void knn_distance_kernel(
    const float* __restrict__ d_calories,      // Normalized calorie array [0,1]
    const float* __restrict__ d_diets,         // Diet encoding: 0=Veg, 1=NonVeg
    const float* __restrict__ d_jaccard_scores, // Pre-computed Jaccard distances [0,1]
    const float* __restrict__ d_ratings,        // Recipe ratings [3.5, 5.0]
    float*       __restrict__ d_distances,      // Output: computed distances
    const float  query_cal,                     // Normalized user calorie target
    const float  query_diet,                    // User diet: 0.0=Veg, 1.0=NonVeg
    const int    n_recipes
) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n_recipes) return;

    // Calorie distance (×2 weight)
    float cal_dist   = (d_calories[idx] - query_cal) * 2.0f;

    // Diet mismatch penalty (strict: 100 if mismatch, 0 if match)
    float diet_dist  = (fabsf(d_diets[idx] - query_diet) > 0.5f) ? 100.0f : 0.0f;

    // Ingredient distance (×10 weight — primary recommendation driver)
    float ing_dist   = d_jaccard_scores[idx] * 10.0f;

    // Rating bonus (higher rating = slightly shorter distance, max 0.1)
    float rating_bonus = (d_ratings[idx] - 3.5f) / 1.5f * 0.1f;

    // Weighted Euclidean distance
    d_distances[idx] = sqrtf(
        cal_dist  * cal_dist  +
        diet_dist * diet_dist +
        ing_dist  * ing_dist
    ) - rating_bonus;
}

// ─── Kernel 2: Jaccard Similarity for Ingredient Matching ────────────────────
/**
 * Computes Jaccard distance = 1 - (|A∩B| / |A∪B|) for ingredient sets.
 * Uses bit-vector encoding for O(1) set operations within each thread.
 * 
 * Ingredient vocabulary is fixed at 41 items → fits in a 64-bit integer.
 */
__global__ void jaccard_kernel(
    const uint64_t* __restrict__ d_recipe_bitvecs, // Recipe ingredient bitvectors
    const uint64_t  query_bitvec,                   // User ingredient bitvector
    const int       query_count,                    // User ingredient count
    float*          __restrict__ d_jaccard_out,     // Output Jaccard distances
    const int       n_recipes
) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n_recipes) return;

    uint64_t recipe_vec = d_recipe_bitvecs[idx];

    // Intersection = AND → popcount
    uint64_t intersect = recipe_vec & query_bitvec;
    int intersection = __popcll(intersect);

    // Union = OR → popcount
    uint64_t uni = recipe_vec | query_bitvec;
    int union_count = __popcll(uni);

    // Jaccard distance = 1 - similarity
    float jaccard_sim = (union_count > 0) ? ((float)intersection / (float)union_count) : 0.0f;
    d_jaccard_out[idx] = 1.0f - jaccard_sim;
}

// ─── Kernel 3: Parallel Top-K Selection (Reduction) ──────────────────────────
/**
 * Finds indices of top-K minimum distances using parallel reduction.
 * Uses shared memory for intra-block reduction.
 * Block size must equal n_recipes for single-block reduction (small K).
 */
__global__ void topk_kernel(
    const float* __restrict__ d_distances,
    int*         __restrict__ d_topk_indices,
    const int    n_recipes,
    const int    k
) {
    extern __shared__ float s_dist[];
    extern __shared__ int   s_idx[];

    int tid = threadIdx.x;
    int idx = blockIdx.x * blockDim.x + threadIdx.x;

    s_dist[tid] = (idx < n_recipes) ? d_distances[idx] : 1e9f;
    s_idx[tid]  = idx;
    __syncthreads();

    // Simple parallel sort within block (for small K)
    // Production code uses thrust::partial_sort for full efficiency
    for (int step = blockDim.x / 2; step > 0; step >>= 1) {
        if (tid < step && s_dist[tid] > s_dist[tid + step]) {
            float tmpd = s_dist[tid]; s_dist[tid] = s_dist[tid + step]; s_dist[tid + step] = tmpd;
            int   tmpi = s_idx[tid];  s_idx[tid]  = s_idx[tid + step];  s_idx[tid + step]  = tmpi;
        }
        __syncthreads();
    }

    if (tid < k) {
        d_topk_indices[tid] = s_idx[tid];
    }
}

// ─── Host Launch Wrapper ──────────────────────────────────────────────────────
extern "C" {

hipError_t launch_knn_kernel(
    const float* d_calories,
    const float* d_diets,
    const float* d_jaccard,
    const float* d_ratings,
    float*       d_distances,
    float        query_cal,
    float        query_diet,
    int          n_recipes,
    hipStream_t  stream
) {
    int threads  = BLOCK_SIZE;
    int blocks   = (n_recipes + threads - 1) / threads;

    hipLaunchKernelGGL(
        knn_distance_kernel,
        dim3(blocks), dim3(threads), 0, stream,
        d_calories, d_diets, d_jaccard, d_ratings, d_distances,
        query_cal, query_diet, n_recipes
    );

    return hipGetLastError();
}

hipError_t launch_jaccard_kernel(
    const uint64_t* d_bitvecs,
    uint64_t        query_bitvec,
    int             query_count,
    float*          d_jaccard_out,
    int             n_recipes,
    hipStream_t     stream
) {
    int threads = BLOCK_SIZE;
    int blocks  = (n_recipes + threads - 1) / threads;

    hipLaunchKernelGGL(
        jaccard_kernel,
        dim3(blocks), dim3(threads), 0, stream,
        d_bitvecs, query_bitvec, query_count, d_jaccard_out, n_recipes
    );

    return hipGetLastError();
}

} // extern "C"
