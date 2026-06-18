cmake_minimum_required(VERSION 3.21)
project(RecipeRecommenderGPU LANGUAGES CXX)

# ── ROCm / HIP Setup ────────────────────────────────────────────────
list(APPEND CMAKE_PREFIX_PATH /opt/rocm)
find_package(hip REQUIRED)

# ── Compiler flags ──────────────────────────────────────────────────
set(CMAKE_CXX_STANDARD 17)
set(HIP_ARCHITECTURES "gfx942")  # AMD Instinct MI300X

set(HIP_FLAGS
    --offload-arch=${HIP_ARCHITECTURES}
    -O3
    -ffast-math
    -DNDEBUG
)

# ── GPU Library ─────────────────────────────────────────────────────
set_source_files_properties(knn_kernel.hip PROPERTIES LANGUAGE HIP)

add_library(recipe_gpu SHARED knn_kernel.hip)
target_compile_options(recipe_gpu PRIVATE ${HIP_FLAGS})
target_link_libraries(recipe_gpu hip::device)

# ── Benchmark executable ────────────────────────────────────────────
set_source_files_properties(benchmark.hip PROPERTIES LANGUAGE HIP)
add_executable(recipe_benchmark benchmark.hip)
target_compile_options(recipe_benchmark PRIVATE ${HIP_FLAGS})
target_link_libraries(recipe_benchmark recipe_gpu hip::device)

# ── Install ─────────────────────────────────────────────────────────
install(TARGETS recipe_gpu DESTINATION lib)
install(TARGETS recipe_benchmark DESTINATION bin)

message(STATUS "ROCm GPU build configured for: ${HIP_ARCHITECTURES}")
message(STATUS "HIP path: ${HIP_ROOT_DIR}")
