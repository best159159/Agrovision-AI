"""
Convert Kaggle model weights → cassava_competition_model_v2.keras
รันใน: cd c:\project\international\backend
python -X utf8 convert_weights.py
"""
import os, sys, shutil
sys.stdout.reconfigure(encoding='utf-8') if hasattr(sys.stdout, 'reconfigure') else None

import tensorflow as tf
import numpy as np

# ── Config ─────────────────────────────────────────────────────────
# ลองทั้ง 2 ไฟล์ — อันไหนโหลดได้ใช้อันนั้น
CANDIDATES = [
    (r"c:\project\international\model.weights2.h5",  "EfficientNetV2M", 384),
    (r"c:\project\international\model.weights.h5",   "EfficientNetV2L", 384),
    (r"c:\project\international\model.weights2.h5",  "EfficientNetV2M", 320),
    (r"c:\project\international\model.weights2.h5",  "EfficientNetV2S", 384),
]
OUTPUT_KERAS = r"c:\project\international\model\cassava_competition_model_v2.keras"
NUM_CLASSES  = 5
# ───────────────────────────────────────────────────────────────────

tf.keras.mixed_precision.set_global_policy('float32')
print(f"TF {tf.__version__}")


def build_model(backbone_name, img_size, num_classes):
    backbone_cls = getattr(tf.keras.applications, backbone_name)
    backbone = backbone_cls(
        include_top=False, weights=None,
        input_shape=(img_size, img_size, 3),
    )
    inputs = tf.keras.Input(shape=(img_size, img_size, 3))
    x   = backbone(inputs, training=False)
    avg = tf.keras.layers.GlobalAveragePooling2D()(x)
    mx  = tf.keras.layers.GlobalMaxPooling2D()(x)
    x   = tf.keras.layers.Concatenate()([avg, mx])
    x   = tf.keras.layers.BatchNormalization()(x)
    x   = tf.keras.layers.Dropout(0.4)(x)
    x   = tf.keras.layers.Dense(512, activation='swish',
              kernel_regularizer=tf.keras.regularizers.l2(1e-4))(x)
    x   = tf.keras.layers.Dropout(0.3)(x)
    out = tf.keras.layers.Dense(num_classes, activation='softmax', dtype='float32')(x)
    model = tf.keras.Model(inputs, out)
    # Build with dummy input
    _ = model(tf.zeros([1, img_size, img_size, 3]))
    return model


# Strategy 1: Try loading as full Keras model directly
print("\n=== Strategy 1: Load as full Keras model ===")
for fpath, backbone, img_size in CANDIDATES:
    try:
        m = tf.keras.models.load_model(fpath, compile=False)
        print(f"  LOADED full model from {os.path.basename(fpath)}")
        print(f"  Input: {m.input_shape}, Params: {m.count_params():,}")
        m.save(OUTPUT_KERAS)
        print(f"  Saved -> {OUTPUT_KERAS}")
        sys.exit(0)
    except Exception as e:
        print(f"  {os.path.basename(fpath)}: {str(e)[:80]}")

# Strategy 2: Copy to .weights.h5 extension so Keras 3 detects correctly
print("\n=== Strategy 2: Keras 3 native weights format ===")
for fpath, backbone, img_size in CANDIDATES:
    # Keras 3 uses .weights.h5 extension to detect format
    tmp_path = fpath.replace('.h5', '.weights.h5') if not fpath.endswith('.weights.h5') else fpath
    if tmp_path != fpath:
        shutil.copy2(fpath, tmp_path)
    try:
        model = build_model(backbone, img_size, NUM_CLASSES)
        model.load_weights(tmp_path)
        pred = model(tf.zeros([1, img_size, img_size, 3]), training=False)
        print(f"  LOADED weights: {backbone} {img_size}x{img_size}")
        print(f"  Test pred: {pred.numpy()}")
        model.save(OUTPUT_KERAS)
        print(f"  Saved -> {OUTPUT_KERAS}")
        if tmp_path != fpath:
            os.remove(tmp_path)
        
        # Export TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_types = [tf.float16]
        tflite = converter.convert()
        tflite_path = OUTPUT_KERAS.replace('.keras', '_fp16.tflite')
        with open(tflite_path, 'wb') as f:
            f.write(tflite)
        print(f"  TFLite: {tflite_path} ({len(tflite)/1024/1024:.1f} MB)")
        
        print("\n=== DONE ===")
        print("แก้ backend/.env:")
        print("  CASSAVA_MODEL_PATH=../model/cassava_competition_model_v2.keras")
        sys.exit(0)
    except Exception as e:
        print(f"  {backbone} {img_size}: {str(e)[:100]}")
        if tmp_path != fpath and os.path.exists(tmp_path):
            os.remove(tmp_path)

# Strategy 3: Load by_name
print("\n=== Strategy 3: load_weights by_name ===")
for fpath, backbone, img_size in CANDIDATES:
    try:
        model = build_model(backbone, img_size, NUM_CLASSES)
        model.load_weights(fpath, by_name=True, skip_mismatch=True)
        pred = model(tf.zeros([1, img_size, img_size, 3]), training=False)
        print(f"  LOADED (by_name): {backbone} {img_size}x{img_size}")
        model.save(OUTPUT_KERAS)
        print(f"  Saved -> {OUTPUT_KERAS}")
        print("\n=== DONE ===")
        sys.exit(0)
    except Exception as e:
        print(f"  {backbone} {img_size}: {str(e)[:100]}")

print("\nAll strategies failed — check what backbone/imgsize was used on Kaggle")
