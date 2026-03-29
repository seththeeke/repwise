// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorWorkoutLiveActivity",
    platforms: [.iOS("16.2")],
    products: [
        .library(name: "WorkoutActivityKit", targets: ["WorkoutActivityKit"]),
        .library(name: "CapacitorWorkoutLiveActivity", targets: ["WorkoutLiveActivityPlugin"]),
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.2.0"),
    ],
    targets: [
        .target(
            name: "WorkoutActivityKit",
            path: "ios/Sources/WorkoutActivityKit"
        ),
        .target(
            name: "WorkoutLiveActivityPlugin",
            dependencies: [
                "WorkoutActivityKit",
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
            ],
            path: "ios/Sources/WorkoutLiveActivityPlugin"
        ),
    ]
)
