import ActivityKit
import SwiftUI
import WidgetKit
import WorkoutActivityKit

struct WorkoutLiveActivityLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            lockScreenView(state: context.state)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { EmptyView() }
                DynamicIslandExpandedRegion(.trailing) { EmptyView() }
                DynamicIslandExpandedRegion(.center) {
                    ExpandedDynamicIslandTimer(state: context.state)
                }
                .contentMargins(.horizontal, 4)
                DynamicIslandExpandedRegion(.bottom) {
                    expandedIslandCaption(state: context.state)
                }
                .contentMargins(.horizontal, 8)
            } compactLeading: {
                Image(systemName: "figure.strengthtraining.traditional")
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .frame(width: 22, alignment: .leading)
            } compactTrailing: {
                CompactLiveSessionTimer(state: context.state)
            } minimal: {
                Image(systemName: "timer")
            }
        }
    }

    @ViewBuilder
    private func lockScreenView(state: WorkoutActivityAttributes.ContentState) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            if !state.workoutName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Text(state.workoutName)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            HStack(alignment: .firstTextBaseline) {
                Text(state.exerciseName)
                    .font(.headline)
                Spacer(minLength: 8)
                LiveSessionTimer(state: state, font: .title2)
            }
            setsAndRepsLine(state: state)
            subtitle(state: state)
        }
        .padding()
    }

    /// Expanded Dynamic Island only: one line under the timer, truncated — avoids overlapping the sensor strip.
    @ViewBuilder
    private func expandedIslandCaption(state: WorkoutActivityAttributes.ContentState) -> some View {
        let workout = state.workoutName.trimmingCharacters(in: .whitespacesAndNewlines)
        let line: String = {
            if workout.isEmpty { return state.exerciseName }
            return "\(workout) · \(state.exerciseName)"
        }()
        Text(line)
            .font(.caption2)
            .fontWeight(.medium)
            .foregroundStyle(.secondary)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private func setsAndRepsLine(state: WorkoutActivityAttributes.ContentState) -> some View {
        if state.modality == "DURATION" {
            if let remaining = state.durationRemainingSeconds {
                Text("Duration · \(remaining)s left")
                    .font(.subheadline)
                    .fontWeight(.medium)
            } else if let d = state.durationSeconds {
                Text("Duration · \(d)s")
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
        } else {
            let s = state.targetSets ?? 3
            let r = state.targetReps ?? 8
            Text("\(s) sets × \(r) reps")
                .font(.subheadline)
                .fontWeight(.medium)
        }
    }

    @ViewBuilder
    private func subtitle(state: WorkoutActivityAttributes.ContentState) -> some View {
        if state.isPaused {
            Text("Paused")
                .foregroundStyle(.secondary)
        } else if let w = state.weight, let u = state.weightUnit {
            Text("Weight · \(Int(w)) \(u)")
                .foregroundStyle(.secondary)
        } else {
            Text("Repwise")
                .foregroundStyle(.secondary)
        }
    }

}
