#!/usr/bin/env python3
"""Read-only APK checks; these do not claim an Android device runtime test."""
from pathlib import Path
import hashlib
import json
import os
import re
import subprocess
import xml.etree.ElementTree as ET
import zipfile

root = Path(__file__).resolve().parents[2]
apk = root / "artifacts/sajag-debug.apk"
java = next((root / ".tools/jdk").glob("*/Contents/Home"))
sdk = root / ".tools/android-sdk"
env = os.environ.copy()
env.update(JAVA_HOME=str(java), ANDROID_HOME=str(sdk))
env["PATH"] = str(java / "bin") + os.pathsep + env.get("PATH", "")

def run(*args):
    return subprocess.run(args, env=env, check=True, capture_output=True, text=True).stdout

ns = "{http://schemas.android.com/apk/res/android}"
manifest = ET.fromstring(run(str(sdk / "cmdline-tools/latest/bin/apkanalyzer"), "manifest", "print", str(apk)))
assert manifest.get("package") == "org.sajag.app"
assert manifest.get(ns + "versionCode") == "11"
assert manifest.get(ns + "versionName") == "2.0"
permissions = {entry.get(ns + "name") for entry in manifest.findall("uses-permission")}
assert "android.permission.RECORD_AUDIO" in permissions
assert not any(word in permission for permission in permissions for word in ("SMS", "CONTACTS", "CALL_LOG"))
queries = {entry.get(ns + "name") for entry in manifest.findall("queries/intent/action")}
assert {"android.speech.RecognitionService", "android.intent.action.TTS_SERVICE"} <= queries
microphone = next(entry for entry in manifest.findall("uses-feature") if entry.get(ns + "name") == "android.hardware.microphone")
assert microphone.get(ns + "required") == "false"

with zipfile.ZipFile(apk) as archive:
    assert archive.testzip() is None
    assert not any(re.search(r"(?:^|/)downloads(?:/|$)|\.apk$", name, re.I) for name in archive.namelist()), "APK recursively contains a download or another APK"
    config = json.loads(archive.read("assets/capacitor.config.json"))
    bars = config["plugins"]["SystemBars"]
    assert bars == {"style": "LIGHT", "insetsHandling": "css", "initialViewportFitValueHint": "cover"}
    assert config["backgroundColor"] == "#f5f5fb"
    assert config.get("android", {}).get("loggingBehavior", config.get("loggingBehavior")) == "none"
    assert not config.get("server", {}).get("url")
    assert config.get("server", {}).get("androidScheme") == "https"
    assert config.get("webDir") == "dist", "Temporary staging path must not reach the APK"
    dex = [archive.read(name) for name in archive.namelist() if re.fullmatch(r"classes\d*\.dex", name)]
    classes = ("MainActivity", "SharedText", "SajagVoicePlugin", "VoiceText", "RecognitionSession")
    for name in classes:
        assert any(f"Lorg/sajag/app/{name};".encode() in content for content in dex), f"Missing native class: {name}"
    assert any(b"bn-IN" in content for content in dex), "Bengali locale is absent from native voice code"
    assert any(b"publicContent" in content and b"openVoiceDataSettings" in content for content in dex), "Native public-readout/settings contract is absent"
    webp = [name for name in archive.namelist() if name.startswith("assets/public/emoji/") and name.endswith(".webp")]
    assert len(webp) == 32, f"Expected 32 bundled emoji images, found {len(webp)}"
    for name in webp:
        relative = name.removeprefix("assets/public/")
        assert archive.read(name) == (root / "android/app/src/main/assets/public" / relative).read_bytes()
    js = b"\n".join(archive.read(name) for name in archive.namelist() if name.startswith("assets/public/assets/") and name.endswith(".js"))
    assert b"SajagVoice" in js, "Web voice adapter is absent from bundled JavaScript"
    assert b"bn-IN" in js, "Bengali voice locale is absent from bundled JavaScript"
    assert archive.read("assets/public/fonts/noto-sans-bengali-400.woff2") == (root / "dist/fonts/noto-sans-bengali-400.woff2").read_bytes(), "Bundled Bengali font differs from frozen dist"
    assert b"https://sajag-ashen.vercel.app" in js, "Native production API fallback is absent from bundled JavaScript"
    index = archive.read("assets/public/index.html").decode()
    scripts = re.findall(r'<script[^>]+src="([^"]+)"', index)
    styles = re.findall(r'<link[^>]+href="([^"]+\.css)"', index)

compiled = root / "android/app/build/intermediates/javac/debug/compileDebugJavaWithJavac/classes"
main_code = run(str(java / "bin/javap"), "-c", "-p", "-classpath", str(compiled), "org.sajag.app.MainActivity")
creation = main_code.split("protected void onCreate(", 1)[1].split("protected void onNewIntent(", 1)[0]
assert "SajagVoicePlugin" in creation and "registerPlugin" in creation
assert creation.index("registerPlugin") < creation.index("BridgeActivity.onCreate")
assert creation.index("ifnonnull") < creation.index("readSharedText") < creation.index("setIntent") < creation.index("BridgeActivity.onCreate")
share_code = main_code.split("private void openSharedText(", 1)[1].split("private android.content.Intent cleanLaunchIntent", 1)[0]
assert "getServerUrl" in share_code and "getLocalUrl" in share_code

junit = ET.parse(root / "android/app/build/test-results/testDebugUnitTest/TEST-org.sajag.app.VoiceTextTest.xml").getroot()
assert junit.get("tests") == "11" and junit.get("failures") == "0" and junit.get("errors") == "0"
recognition_junit = ET.parse(root / "android/app/build/test-results/testDebugUnitTest/TEST-org.sajag.app.RecognitionSessionTest.xml").getroot()
assert recognition_junit.get("tests") == "7" and recognition_junit.get("failures") == "0" and recognition_junit.get("errors") == "0"
devices = run(str(sdk / "platform-tools/adb"), "devices", "-l")
connected = [line for line in devices.splitlines()[1:] if line.strip()]
print(json.dumps({
    "result": "PASS",
    "versionCode": 11,
    "versionName": "2.0",
    "sizeBytes": apk.stat().st_size,
    "sha256": hashlib.sha256(apk.read_bytes()).hexdigest(),
    "compiledMicrophonePermission": True,
    "microphoneHardwareOptional": True,
    "compiledSpeechAndTtsQueries": True,
    "systemBars": bars,
    "backgroundColor": config["backgroundColor"],
    "loggingBehavior": "none",
    "nativeOrigin": "https://localhost",
    "productionApiFallback": "https://sajag-ashen.vercel.app",
    "nativeDexClasses": list(classes),
    "bundledEmojiWebpImages": len(webp),
    "voiceJavaHelperTests": 11,
    "recognitionSessionTests": 7,
    "bengaliVoiceLocaleAndFont": True,
    "publicReadoutAndVoiceSettingsContract": True,
    "compiledVoiceRegistrationAndShareRestorationGuard": True,
    "embeddedDownloadsOrApks": False,
    "entryScripts": scripts,
    "styles": styles,
    "connectedDeviceCount": len(connected),
    "deviceRuntimeTested": False,
}, indent=2))
