#if os(iOS)
import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Attributes (must stay in sync with LiveActivityView.swift)

struct LiveActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var title: String
        var subtitle: String?
        var timerEndDateInMilliseconds: Double?
        var progress: Double?
        var imageName: String?
        var dynamicIslandImageName: String?
    }
    var name: String
    var backgroundColor: String?
    var titleColor: String?
    var subtitleColor: String?
    var progressViewTint: String?
    var progressViewLabelColor: String?
    var deepLinkUrl: String?
}

// MARK: - Widget Entry Point

struct LiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LiveActivityAttributes.self) { context in
            LiveActivityView(contentState: context.state, attributes: context.attributes)
                .activityBackgroundTint(Color.black)
                .activitySystemActionForegroundColor(Color.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    ExpandedLeadingView(state: context.state)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ExpandedTrailingView(state: context.state)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    LiveActivityView(contentState: context.state, attributes: context.attributes)
                }
            } compactLeading: {
                CompactLeadingView(state: context.state)
            } compactTrailing: {
                CompactTrailingView(state: context.state)
            } minimal: {
                MinimalView(state: context.state)
            }
            .widgetURL(URL(string: "delivery-app://order"))
            .keylineTint(Color(hex: "#007AFF"))
        }
    }
}

// MARK: - Expanded Leading (emoji + status title)

private struct ExpandedLeadingView: View {
    let state: LiveActivityAttributes.ContentState
    private var step: Int { state.subtitle?.toDeliveryData()?.currentStep ?? 1 }

    var body: some View {
        HStack(spacing: 6) {
            Text(statusEmoji(step))
                .font(.system(size: 18))
            Text(shortTitle(step))
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
        }
        .padding(.leading, 6)
    }

    private func statusEmoji(_ s: Int) -> String {
        switch s {
        case 1:      return "✅"
        case 2:      return "🧑‍🍳"
        case 3:      return "📦"
        case 4:      return "🛵"
        case 5:      return "🏠"
        default:     return "🍔"
        }
    }

    private func shortTitle(_ s: Int) -> String {
        switch s {
        case 1:      return "Confirmed"
        case 2:      return "Preparing"
        case 3:      return "Ready"
        case 4:      return "On the way"
        case 5:      return "Delivered"
        default:     return "Order"
        }
    }
}

// MARK: - Expanded Trailing (MM:SS live countdown)

private struct ExpandedTrailingView: View {
    let state: LiveActivityAttributes.ContentState
    private var step: Int { state.subtitle?.toDeliveryData()?.currentStep ?? 1 }
    private var isDone: Bool { step >= 5 }

    var body: some View {
        VStack(alignment: .trailing, spacing: 0) {
            if isDone {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.green)
            } else if let ms = state.timerEndDateInMilliseconds {
                let end = Date(timeIntervalSince1970: ms / 1000)
                Text(timerInterval: Date()...end, countsDown: true)
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .foregroundColor(Color(hex: "#007AFF"))
                    .monospacedDigit()
                    .multilineTextAlignment(.trailing)
                Text("left")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(.gray)
            } else {
                let mins = state.subtitle?.toDeliveryData()?.timeRemaining ?? ""
                Text(mins.isEmpty ? "--:--" : "\(mins):00")
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .foregroundColor(Color(hex: "#007AFF"))
                    .monospacedDigit()
                Text("left")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(.gray)
            }
        }
        .padding(.trailing, 6)
    }
}

// MARK: - Compact Leading (status emoji)

private struct CompactLeadingView: View {
    let state: LiveActivityAttributes.ContentState
    private var step: Int { state.subtitle?.toDeliveryData()?.currentStep ?? 1 }

    var body: some View {
        Text(emoji(step))
            .font(.system(size: 16))
            .padding(.leading, 4)
    }

    private func emoji(_ s: Int) -> String {
        switch s {
        case 1:      return "✅"
        case 2:      return "🧑‍🍳"
        case 3:      return "📦"
        case 4:      return "🛵"
        case 5:      return "🏠"
        default:     return "🍔"
        }
    }
}

// MARK: - Compact Trailing (MM:SS or "Delivered")

private struct CompactTrailingView: View {
    let state: LiveActivityAttributes.ContentState
    private var step: Int { state.subtitle?.toDeliveryData()?.currentStep ?? 1 }

    var body: some View {
        Group {
            if step >= 5 {
                Text("Delivered")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(.green)
            } else if let ms = state.timerEndDateInMilliseconds {
                let end = Date(timeIntervalSince1970: ms / 1000)
                Text(timerInterval: Date()...end, countsDown: true)
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundColor(Color(hex: "#007AFF"))
                    .monospacedDigit()
            } else {
                let mins = state.subtitle?.toDeliveryData()?.timeRemaining ?? ""
                Text(mins.isEmpty ? "--" : "\(mins) min")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundColor(Color(hex: "#007AFF"))
            }
        }
        .padding(.trailing, 4)
    }
}

// MARK: - Minimal (emoji only)

private struct MinimalView: View {
    let state: LiveActivityAttributes.ContentState
    private var step: Int { state.subtitle?.toDeliveryData()?.currentStep ?? 1 }

    var body: some View {
        switch step {
        case 1:      Text("✅").font(.system(size: 14))
        case 2:      Text("🧑‍🍳").font(.system(size: 14))
        case 3:      Text("📦").font(.system(size: 14))
        case 4:      Text("🛵").font(.system(size: 14))
        case 5:      Text("🏠").font(.system(size: 14))
        default:     Text("🍔").font(.system(size: 14))
        }
    }
}

// MARK: - Local Helpers (to ensure availability in widget target)

extension Color {
  init(hex: String) {
    var cString: String = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    if cString.hasPrefix("#") { cString.remove(at: cString.startIndex) }
    if (cString.count) != 6, (cString.count) != 8 {
      self.init(.white)
      return
    }
    var rgbValue: UInt64 = 0
    Scanner(string: cString).scanHexInt64(&rgbValue)
    if (cString.count) == 8 {
      self.init(.sRGB, red: Double((rgbValue >> 24) & 0xFF) / 255, green: Double((rgbValue >> 16) & 0xFF) / 255, blue: Double((rgbValue >> 08) & 0xFF) / 255, opacity: Double((rgbValue >> 00) & 0xFF) / 255)
    } else {
      self.init(.sRGB, red: Double((rgbValue >> 16) & 0xFF) / 255, green: Double((rgbValue >> 08) & 0xFF) / 255, blue: Double((rgbValue >> 00) & 0xFF) / 255, opacity: 1)
    }
  }
}

#endif

