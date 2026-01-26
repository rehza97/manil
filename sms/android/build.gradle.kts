allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

// Configure build directory to match Flutter's expected output location
// This ensures the APK is generated in build/app/outputs/flutter-apk/ where Flutter expects it
rootProject.buildDir = file("../build")
subprojects {
    project.buildDir = file("${rootProject.buildDir}/${project.name}")
}

subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
