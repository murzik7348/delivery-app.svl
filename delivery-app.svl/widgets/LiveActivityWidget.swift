#if os(iOS)
import ActivityKit
import SwiftUI
import WidgetKit
import AppIntents

// MARK: - Intents

@available(iOS 16.0, macOS 13.0, watchOS 9.0, tvOS 16.0, *)
struct CallIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Call Courier"
    
    @Parameter(title: "Phone Number")
    var phoneNumber: String
    
    init() {}
    
    init(phoneNumber: String) {
        self.phoneNumber = phoneNumber
    }
    
    func perform() async throws -> some IntentResult {
        // Logika дзвінка у фоні
        return .result()
    }
}

// MARK: - Attributes (must stay in sync with LiveActivityView.swift)

struct LiveActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        // Direct APNs sync fields (NestJS backend)
        var status: Int?
        var eta: String?
        var courierName: String?
        var courierPhoto: String?
        var courierPhone: String?
        var restaurantName: String?
        var reservationTime: String?
        var courierRating: String?
        var mapThumbnail: String?
        
        // Timer for live countdown
        var timerEndDateInMilliseconds: Double?
        
        // App-to-Widget bridge fields (legacy/JSON)
        var title: String?
        var subtitle: String?
        
        // Decorative/Legacy
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
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label {
                        VStack(alignment: .leading, spacing: 0) {
                            Text(shortStatus(context.state))
                                .font(.system(size: 14, weight: .bold))
                            
                            if let resTime = context.state.reservationTime ?? context.state.subtitle?.toDeliveryData()?.reservationTime, currentStep(context.state) < 3 {
                                Text(resTime)
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(Color(hex: "#007AFF"))
                            }
                        }
                    } icon: {
                        Text(statusEmoji(context.state))
                    }
                    .padding(.leading, 8)
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    DynamicIslandETABadge(state: context.state)
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 12) {
                        TimelineView(status: currentStep(context.state))
                            .padding(.horizontal, 8)
                        
                        let step = currentStep(context.state)
                        let data = context.state.subtitle?.toDeliveryData()
                        let courier = context.state.courierName ?? data?.courierName
                        let phone = context.state.courierPhone ?? data?.courierPhone ?? ""
                        
                        if let name = courier, step == 4 {
                             HStack(spacing: 10) {
                                 CourierPhotoView(
                                     photoFileName: context.state.courierPhoto ?? data?.courierPhoto,
                                     courierName: name,
                                     size: 36
                                 )
                                 
                                 VStack(alignment: .leading, spacing: 2) {
                                     Text(name)
                                         .font(.system(size: 14, weight: .bold))
                                     Text(context.state.eta ?? data?.distance ?? "Nearby")
                                         .font(.system(size: 11))
                                         .foregroundColor(.green)
                                 }
                                 
                                 Spacer()
                                 
                                 if !phone.isEmpty {
                                     if #available(iOS 17.0, *) {
                                         Button(intent: CallIntent(phoneNumber: phone.replacingOccurrences(of: " ", with: ""))) {
                                             HStack(spacing: 4) {
                                                 Image(systemName: "phone.fill")
                                                     .font(.system(size: 10, weight: .bold))
                                                 Text("Call")
                                                     .font(.system(size: 10, weight: .bold))
                                             }
                                             .foregroundColor(.white)
                                             .padding(.vertical, 6)
                                             .padding(.horizontal, 12)
                                             .background(Capsule().fill(Color.blue))
                                         }
                                         .buttonStyle(.plain)
                                     } else {
                                         if let url = URL(string: "tel:\(phone.replacingOccurrences(of: " ", with: ""))") {
                                             Link(destination: url) {
                                                 HStack(spacing: 4) {
                                                     Image(systemName: "phone.fill")
                                                         .font(.system(size: 10, weight: .bold))
                                                     Text("Call")
                                                         .font(.system(size: 10, weight: .bold))
                                                 }
                                                 .foregroundColor(.white)
                                                 .padding(.vertical, 6)
                                                 .padding(.horizontal, 12)
                                                 .background(Capsule().fill(Color.blue))
                                             }
                                         }
                                     }
                                 }
                             }
                             .padding(.horizontal, 8)
                        }
                    }
                    .padding(.bottom, 8)
                }
            } compactLeading: {
                Text(statusEmoji(context.state))
                    .font(.system(size: 18))
            } compactTrailing: {
                CompactETABadge(state: context.state)
            } minimal: {
                Text(statusEmoji(context.state))
            }
            .widgetURL(URL(string: "delivery-app://order"))
            .keylineTint(Color(hex: "#007AFF"))
        }
    }
    
    // Helpers
    
    private func currentStep(_ state: LiveActivityAttributes.ContentState) -> Int {
        if let status = state.status { return status }
        return state.subtitle?.toDeliveryData()?.currentStep ?? 1
    }
    
    private func statusEmoji(_ state: LiveActivityAttributes.ContentState) -> String {
        switch currentStep(state) {
        case 1: return "👨‍🍳"
        case 2: return "🍳"
        case 3: return "📦"
        case 4: return "🛵"
        case 5: return "🏠"
        default: return "🍔"
        }
    }
    
    private func shortStatus(_ state: LiveActivityAttributes.ContentState) -> String {
        switch currentStep(state) {
        case 1: return "Prep"
        case 2: return "Cook"
        case 3: return "Ready"
        case 4: return "En Route"
        case 5: return "Arrived"
        default: return "Order"
        }
    }
}

// MARK: - Dynamic Island Specific Components

private struct DynamicIslandETABadge: View {
    let state: LiveActivityAttributes.ContentState
    
    var body: some View {
        VStack(alignment: .trailing, spacing: 0) {
            if let ms = state.timerEndDateInMilliseconds {
                let end = Date(timeIntervalSince1970: ms / 1000)
                Text(timerInterval: Date()...end, countsDown: true)
                    .font(.system(size: 20, weight: .black, design: .rounded))
                    .foregroundColor(Color(hex: "#007AFF"))
                    .monospacedDigit()
            } else {
                Text(state.eta ?? state.subtitle?.toDeliveryData()?.timeRemaining ?? "--")
                    .font(.system(size: 20, weight: .black, design: .rounded))
                    .foregroundColor(Color(hex: "#007AFF"))
            }
            Text("MINS")
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(.gray)
        }
        .padding(.trailing, 8)
    }
}

private struct CompactETABadge: View {
    let state: LiveActivityAttributes.ContentState
    
    var body: some View {
        Group {
            if let ms = state.timerEndDateInMilliseconds {
                let end = Date(timeIntervalSince1970: ms / 1000)
                Text(timerInterval: Date()...end, countsDown: true)
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundColor(Color(hex: "#007AFF"))
                    .monospacedDigit()
            } else {
                Text(state.eta ?? state.subtitle?.toDeliveryData()?.timeRemaining ?? "--")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundColor(Color(hex: "#007AFF"))
            }
        }
    }
}

// MARK: - Local Helpers

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

