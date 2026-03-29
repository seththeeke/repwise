import Capacitor
import Foundation
import ActivityKit
import WorkoutActivityKit

/// `print` is easy to miss in Xcode’s console; `NSLog` shows up in the debug area and Console.app.
private func laLog(_ message: String) {
    NSLog("%@", "[WorkoutLiveActivity] \(message)")
}

@objc(WorkoutLiveActivityPlugin)
public class WorkoutLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    /// Must match `packageClassList` in `capacitor.config.json`.
    public let identifier = "WorkoutLiveActivityPlugin"
    /// Must match `registerPlugin('…')` in TypeScript.
    public let jsName = "WorkoutLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(#selector(startWorkoutActivity(_:))),
        CAPPluginMethod(#selector(updateWorkoutActivity(_:))),
        CAPPluginMethod(#selector(endWorkoutActivity(_:))),
    ]

    private var activity: Activity<WorkoutActivityAttributes>?

    @objc public func startWorkoutActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            laLog("skipped: iOS < 16.2")
            call.resolve()
            return
        }
        Task { @MainActor in
            do {
                let auth = ActivityAuthorizationInfo()
                guard auth.areActivitiesEnabled else {
                    laLog("ERROR: Live Activities disabled — Settings → Repwise → Live Activities")
                    call.reject(
                        "Live Activities are disabled for this app or system-wide. Enable them in Settings.",
                        "LA_DISABLED",
                        nil
                    )
                    return
                }

                let state = Self.parseContentState(from: call)
                let workoutId = call.getString("workoutId") ?? ""
                laLog("start workoutId=\(workoutId) exercise=\(state.exerciseName)")
                let attributes = WorkoutActivityAttributes(workoutId: workoutId)

                if let current = self.activity {
                    await current.end(nil, dismissalPolicy: .immediate)
                    self.activity = nil
                }
                for existing in Activity<WorkoutActivityAttributes>.activities
                    where existing.attributes.workoutId == workoutId
                {
                    await existing.end(nil, dismissalPolicy: .immediate)
                }

                activity = try Activity.request(
                    attributes: attributes,
                    contentState: state,
                    pushType: nil
                )
                laLog("Activity.request OK")
                call.resolve()
            } catch {
                laLog("Activity.request FAILED: \(error.localizedDescription)")
                call.reject("Live Activity start failed", nil, error)
            }
        }
    }

    @objc public func updateWorkoutActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        Task { @MainActor in
            let state = Self.parseContentState(from: call)
            if let activity = activity {
                await activity.update(using: state)
            } else if let workoutId = call.getString("workoutId") {
                for a in Activity<WorkoutActivityAttributes>.activities
                    where a.attributes.workoutId == workoutId
                {
                    await a.update(using: state)
                }
            }
            call.resolve()
        }
    }

    @objc public func endWorkoutActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        Task { @MainActor in
            if let activity = activity {
                await activity.end(nil, dismissalPolicy: .immediate)
                self.activity = nil
            } else {
                for a in Activity<WorkoutActivityAttributes>.activities {
                    await a.end(nil, dismissalPolicy: .immediate)
                }
            }
            call.resolve()
        }
    }

    private static func parseContentState(from call: CAPPluginCall) -> WorkoutActivityAttributes.ContentState {
        let workoutName = call.getString("workoutName") ?? ""
        let exerciseName = call.getString("exerciseName") ?? "Workout"
        let sessionElapsed = call.getInt("sessionElapsedSeconds") ?? 0
        let workoutStartedAt = call.getString("workoutStartedAt") ?? ""
        let totalPausedMs = call.getInt("totalPausedMs") ?? 0
        let pauseRaw = call.getString("pauseStartedAt")
        let pauseStartedAt = (pauseRaw?.isEmpty == false) ? pauseRaw : nil
        let isPaused = call.getBool("isPaused") ?? false
        let modality = call.getString("modality") ?? "SETS_REPS"
        let targetSets = call.getInt("targetSets")
        let targetReps = call.getInt("targetReps")
        let weight = call.getDouble("weight")
        let weightUnit = call.getString("weightUnit")
        let durationSeconds = call.getInt("durationSeconds")
        let durationRemaining = call.getInt("durationRemainingSeconds")
        var durationEnd: Date?
        if let iso = call.getString("durationEndDate"), !iso.isEmpty {
            durationEnd = ISO8601DateFormatter().date(from: iso)
        }
        return WorkoutActivityAttributes.ContentState(
            workoutName: workoutName,
            exerciseName: exerciseName,
            sessionElapsedSeconds: sessionElapsed,
            workoutStartedAt: workoutStartedAt,
            totalPausedMs: totalPausedMs,
            pauseStartedAt: pauseStartedAt,
            isPaused: isPaused,
            modality: modality,
            targetSets: targetSets,
            targetReps: targetReps,
            weight: weight,
            weightUnit: weightUnit,
            durationSeconds: durationSeconds,
            durationRemainingSeconds: durationRemaining,
            durationEnd: durationEnd
        )
    }
}
