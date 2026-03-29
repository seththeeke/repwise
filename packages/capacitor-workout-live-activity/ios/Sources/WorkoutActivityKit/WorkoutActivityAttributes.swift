import ActivityKit
import Foundation

public struct WorkoutActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var workoutName: String
        public var exerciseName: String
        public var sessionElapsedSeconds: Int
        /// ISO8601 — used with pause fields so the widget can compute live elapsed time while the app is suspended.
        public var workoutStartedAt: String
        public var totalPausedMs: Int
        public var pauseStartedAt: String?
        public var isPaused: Bool
        public var modality: String
        public var targetSets: Int?
        public var targetReps: Int?
        public var weight: Double?
        public var weightUnit: String?
        public var durationSeconds: Int?
        public var durationRemainingSeconds: Int?
        public var durationEnd: Date?

        public init(
            workoutName: String,
            exerciseName: String,
            sessionElapsedSeconds: Int,
            workoutStartedAt: String,
            totalPausedMs: Int,
            pauseStartedAt: String?,
            isPaused: Bool,
            modality: String,
            targetSets: Int?,
            targetReps: Int?,
            weight: Double?,
            weightUnit: String?,
            durationSeconds: Int?,
            durationRemainingSeconds: Int?,
            durationEnd: Date?
        ) {
            self.workoutName = workoutName
            self.exerciseName = exerciseName
            self.sessionElapsedSeconds = sessionElapsedSeconds
            self.workoutStartedAt = workoutStartedAt
            self.totalPausedMs = totalPausedMs
            self.pauseStartedAt = pauseStartedAt
            self.isPaused = isPaused
            self.modality = modality
            self.targetSets = targetSets
            self.targetReps = targetReps
            self.weight = weight
            self.weightUnit = weightUnit
            self.durationSeconds = durationSeconds
            self.durationRemainingSeconds = durationRemainingSeconds
            self.durationEnd = durationEnd
        }
    }

    public var workoutId: String

    public init(workoutId: String) {
        self.workoutId = workoutId
    }
}
