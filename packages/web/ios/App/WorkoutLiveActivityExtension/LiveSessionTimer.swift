import SwiftUI
import WorkoutActivityKit

/// Mirrors `computeSessionElapsedSeconds` in the web app.
///
/// **Why not `TimelineView`?** In Live Activities, periodic timeline updates often stop a few seconds after
/// the app is suspended — that is WidgetKit throttling, not user settings. `Text(_:style: .timer)` is
/// updated by the system and keeps ticking on the lock screen.
enum LiveSessionClock {
    static func parseISO8601(_ string: String) -> Date? {
        guard !string.isEmpty else { return nil }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: string) { return d }
        f.formatOptions = [.withInternetDateTime]
        return f.date(from: string)
    }

    static func elapsedSeconds(at date: Date, state: WorkoutActivityAttributes.ContentState) -> Int {
        guard let started = parseISO8601(state.workoutStartedAt) else {
            return state.sessionElapsedSeconds
        }
        var pausedMs = Int64(state.totalPausedMs)
        if state.isPaused, let ps = state.pauseStartedAt, let pauseStart = parseISO8601(ps) {
            pausedMs += Int64(date.timeIntervalSince(pauseStart) * 1000)
        }
        let elapsedMs = Int64(date.timeIntervalSince(started) * 1000) - pausedMs
        return max(0, Int(elapsedMs / 1000))
    }

    static func formatMMSS(_ seconds: Int) -> String {
        let m = seconds / 60
        let s = seconds % 60
        return String(format: "%02d:%02d", m, s)
    }
}

struct LiveSessionTimer: View {
    let state: WorkoutActivityAttributes.ContentState
    var font: Font = .title2

    var body: some View {
        Group {
            if let started = LiveSessionClock.parseISO8601(state.workoutStartedAt), !state.isPaused {
                // Elapsed = now - start - totalPausedMs  ⇔  now - (start + totalPausedMs)
                Text(
                    started.addingTimeInterval(TimeInterval(state.totalPausedMs) / 1000.0),
                    style: .timer
                )
                .font(font)
                .monospacedDigit()
            } else {
                Text(LiveSessionClock.formatMMSS(LiveSessionClock.elapsedSeconds(at: Date(), state: state)))
                    .font(font)
                    .monospacedDigit()
            }
        }
    }
}

/// Dynamic Island **compact** trailing: fixed narrow width so the system shows a split pill (icon | time).
/// Long-press expanded UI uses `ExpandedDynamicIslandTimer` in the `.center` region.
struct CompactLiveSessionTimer: View {
    let state: WorkoutActivityAttributes.ContentState
    private let columnWidth: CGFloat = 56

    var body: some View {
        Group {
            if let started = LiveSessionClock.parseISO8601(state.workoutStartedAt), !state.isPaused {
                Text(
                    started.addingTimeInterval(TimeInterval(state.totalPausedMs) / 1000.0),
                    style: .timer
                )
                .font(.caption2)
                .fontWeight(.semibold)
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            } else {
                Text(LiveSessionClock.formatMMSS(LiveSessionClock.elapsedSeconds(at: Date(), state: state)))
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .monospacedDigit()
                    .lineLimit(1)
            }
        }
        .frame(width: columnWidth, alignment: .trailing)
        .clipped()
    }
}

/// Long-press **expanded** Dynamic Island: large timer in the **center** safe region (not over the camera cutout).
/// Constrained so digits never overflow into invalid layout.
struct ExpandedDynamicIslandTimer: View {
    let state: WorkoutActivityAttributes.ContentState

    private var timerFont: Font {
        .system(size: 34, weight: .bold, design: .rounded)
    }

    var body: some View {
        Group {
            if let started = LiveSessionClock.parseISO8601(state.workoutStartedAt), !state.isPaused {
                Text(
                    started.addingTimeInterval(TimeInterval(state.totalPausedMs) / 1000.0),
                    style: .timer
                )
                .font(timerFont)
                .monospacedDigit()
            } else {
                Text(LiveSessionClock.formatMMSS(LiveSessionClock.elapsedSeconds(at: Date(), state: state)))
                    .font(timerFont)
                    .monospacedDigit()
            }
        }
        .lineLimit(1)
        .minimumScaleFactor(0.55)
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 6)
        // If the timer is too wide for the center slot, system can move it below instead of clipping into unsafe areas.
        .dynamicIsland(verticalPlacement: .belowIfTooWide)
    }
}
