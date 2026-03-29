import SwiftUI

private struct TextWidthPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}

/// Horizontally scrolling “banner” when `text` is wider than the container (seamless loop).
struct TickerMarquee: View {
    let text: String
    var font: Font = .subheadline
    var fontWeight: Font.Weight = .semibold

    @State private var segmentWidth: CGFloat = 0
    private let gap: CGFloat = 28
    private let speedPtsPerSec: CGFloat = 26

    var body: some View {
        GeometryReader { geo in
            let needsScroll = segmentWidth > geo.size.width + 0.5 && segmentWidth > 0
            ZStack(alignment: .leading) {
                if needsScroll {
                    TimelineView(.periodic(from: .now, by: 1.0 / 30.0)) { timeline in
                        let period = max(segmentWidth + gap, 1)
                        let t = CGFloat(timeline.date.timeIntervalSinceReferenceDate) * speedPtsPerSec
                        let off = -t.truncatingRemainder(dividingBy: period)

                        HStack(spacing: gap) {
                            label
                            label
                        }
                        .fixedSize(horizontal: true, vertical: false)
                        .offset(x: off)
                    }
                } else {
                    label
                        .lineLimit(1)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .clipped()
            .overlay(alignment: .leading) {
                label
                    .lineLimit(1)
                    .fixedSize(horizontal: true, vertical: false)
                    .background(
                        GeometryReader { g in
                            Color.clear.preference(key: TextWidthPreferenceKey.self, value: g.size.width)
                        }
                    )
                    .hidden()
            }
            .onPreferenceChange(TextWidthPreferenceKey.self) { segmentWidth = $0 }
        }
        .frame(height: 20)
    }

    private var label: some View {
        Text(text)
            .font(font)
            .fontWeight(fontWeight)
    }
}
