[app]
title = Pijao nos une
package.name = pijaonosune
package.domain = co.pijao
source.dir = .
source.include_exts = py,png,jpg,json,sql
source.exclude_dirs = tests,tools,docs,supabase,.github
version = 0.10.1
requirements = python3==3.11.5,hostpython3==3.11.5,kivy==2.3.0,requests==2.31.0,urllib3==1.26.18,chardet==5.2.0,idna,certifi,plyer,kivy-garden.mapview==1.0.6,pyjnius,android
icon.filename = %(source.dir)s/assets/icon.png
presplash.filename = %(source.dir)s/assets/presplash.png
presplash.color = #FFFFFF
orientation = portrait
fullscreen = 0
android.permissions = INTERNET,ACCESS_FINE_LOCATION,ACCESS_COARSE_LOCATION,CAMERA
android.accept_sdk_license = True
android.api = 33
android.minapi = 24
android.ndk = 25b
android.ndk_api = 24
android.archs = arm64-v8a
android.release_artifact = apk
# Que los datos de personas no salgan del teléfono en copias de seguridad (adb backup / nube de Google)
android.allow_backup = False

p4a.branch = v2024.01.21

[buildozer]
log_level = 2
warn_on_root = 0
