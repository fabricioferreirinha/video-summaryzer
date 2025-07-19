#!/usr/bin/env python3
"""
Test GPU availability and PyTorch CUDA installation
"""
import torch
import sys

print("=== GPU Test ===")
print(f"Python version: {sys.version}")
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    print(f"CUDA version: {torch.version.cuda}")
    print(f"GPU count: {torch.cuda.device_count()}")
    for i in range(torch.cuda.device_count()):
        gpu_name = torch.cuda.get_device_name(i)
        gpu_memory = torch.cuda.get_device_properties(i).total_memory / 1024**3
        print(f"GPU {i}: {gpu_name} ({gpu_memory:.1f} GB)")
        
    # Test tensor creation on GPU
    try:
        x = torch.randn(1000, 1000, device='cuda')
        print("✓ GPU tensor creation successful")
    except Exception as e:
        print(f"✗ GPU tensor creation failed: {e}")
else:
    print("✗ CUDA not available")
    print("Possible reasons:")
    print("1. PyTorch was not installed with CUDA support")
    print("2. NVIDIA drivers are not installed")
    print("3. CUDA toolkit is not installed")
    print("4. GPU is not CUDA-compatible")
    
    print("\nTo install PyTorch with CUDA support:")
    print("pip uninstall torch torchvision torchaudio")
    print("pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118")