#if os(iOS)
import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Shared Data Model

struct DeliveryData: Codable {
    var restaurantName: String?
    var statusText: String?
    var timeRemaining: String?
    var orderId: String?
    var itemsCount: Int?
    var totalAmount: String?
    var courierName: String?
    var courierPhoto: String?
    var courierPhone: String?
    var distance: String?
    var currentStep: Int?
}

extension String {
    func toDeliveryData() -> DeliveryData? {
        guard let data = self.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(DeliveryData.self, from: data)
    }
}

// MARK: - Timeline Line Helpers

/// Solid blue connector segment
private struct SolidLine: View {
    var body: some View {
        Rectangle()
            .fill(Color(hex: "#007AFF"))
            .frame(height: 2)
    }
}

/// Dashed gray connector segment
private struct DashedLine: View {
    var body: some View {
        GeometryReader { geo in
            Path { path in
                path.move(to: CGPoint(x: 0, y: 1))
                path.addLine(to: CGPoint(x: geo.size.width, y: 1))
            }
            .stroke(
                Color.white.opacity(0.22),
                style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: [4, 6])
            )
        }
        .frame(height: 2)
    }
}

/// Single dot on the timeline
private struct TimelineDot: View {
    let isActive: Bool
    var body: some View {
        Circle()
            .fill(isActive ? Color(hex: "#007AFF") : Color.white.opacity(0.22))
            .frame(width: 9, height: 9)
            .shadow(color: isActive ? Color(hex: "#007AFF").opacity(0.6) : .clear, radius: 4)
    }
}

// MARK: - Emoji Timeline (Uber Eats / BurgerFul style)

private struct EmojiTimeline: View {
    let step: Int              // 1-5
    let restaurantName: String

    // Active thresholds:
    // left dot  → step >= 1 (always when activity is live)
    // mid dot   → step >= 4 (courier picked up)
    // right dot → step >= 5 (delivered)
    // left-mid segment solid when mid is active, else dashed
    // mid-right segment solid when right is active, else dashed

    private var leftActive: Bool  { step >= 1 }
    private var midActive: Bool   { step >= 4 }
    private var rightActive: Bool { step >= 5 }
    private var seg1Solid: Bool   { midActive }
    private var seg2Solid: Bool   { rightActive }

    var body: some View {
        VStack(spacing: 6) {
            // Emoji row
            HStack(alignment: .bottom, spacing: 0) {
                Text("🧑‍🍳").font(.system(size: 22))
                Spacer()
                Text("🛵").font(.system(size: 22))
                Spacer()
                Text("🏠").font(.system(size: 22))
            }
            .padding(.horizontal, 4)

            // Connector row with dots
            HStack(spacing: 0) {
                TimelineDot(isActive: leftActive)

                Group {
                    if seg1Solid { SolidLine() } else { DashedLine() }
                }
                .frame(maxWidth: .infinity)

                TimelineDot(isActive: midActive)

                Group {
                    if seg2Solid { SolidLine() } else { DashedLine() }
                }
                .frame(maxWidth: .infinity)

                TimelineDot(isActive: rightActive)
            }

            // Labels row
            HStack {
                VStack(alignment: .leading, spacing: 1) {
                    Text(restaurantName)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Text("Restaurant")
                        .font(.system(size: 9))
                        .foregroundColor(.white.opacity(0.4))
                }
                Spacer()
                Text("Home")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white)
            }
            .padding(.horizontal, 4)
        }
    }
}

// MARK: - ETA Badge (blue MM:SS countdown)

private struct ETABadge: View {
    let timerEndMs: Double?
    let staticMinutes: String?

    var body: some View {
        VStack(spacing: 1) {
            if let ms = timerEndMs {
                let endDate = Date(timeIntervalSince1970: ms / 1000)
                Text(timerInterval: Date()...endDate, countsDown: true)
                    .font(.system(size: 20, weight: .black, design: .rounded))
                    .foregroundColor(Color(hex: "#007AFF"))
                    .monospacedDigit()
                    .multilineTextAlignment(.center)
            } else {
                let mins = staticMinutes ?? ""
                Text(mins.isEmpty ? "--:--" : "\(mins):00")
                    .font(.system(size: 20, weight: .black, design: .rounded))
                    .foregroundColor(Color(hex: "#007AFF"))
                    .monospacedDigit()
            }
            Text("Mins left")
                .font(.system(size: 9, weight: .semibold))
                .foregroundColor(.white.opacity(0.45))
        }
        .frame(width: 70, height: 60)
        .background(Color.white.opacity(0.07))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
}

// MARK: - Main Expanded View

struct LiveActivityView: View {
    let contentState: LiveActivityAttributes.ContentState
    let attributes: LiveActivityAttributes

    private var data: DeliveryData? { contentState.subtitle?.toDeliveryData() }
    private var step: Int   { data?.currentStep ?? 1 }
    private var isDelivering: Bool { step >= 4 }
    private var isDelivered: Bool  { step >= 5 }

    // Status config per step
    private var headerEmoji: String {
        switch step {
        case 1: return "✅"
        case 2: return "🧑‍🍳"
        case 3: return "📦"
        case 4: return "🛵"
        case 5: return "🏠"
        default: return "🍔"
        }
    }
    private var headerTitle: String {
        switch step {
        case 1: return "Order Confirmed"
        case 2: return "Preparing your food"
        case 3: return "Order is ready"
        case 4: return "On the way"
        case 5: return "Order delivered"
        default: return "Order"
        }
    }
    private var headerSubtitle: String {
        switch step {
        case 1: return "Restaurant accepted your order."
        case 2: return "Courier on the way."
        case 3: return "Waiting for courier pickup."
        case 4: return "Order arriving soon."
        case 5: return "Enjoy your food!"
        default: return ""
        }
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                topSection
                    .padding(.top, 16)

                Spacer().frame(height: 18)

                EmojiTimeline(
                    step: step,
                    restaurantName: data?.restaurantName ?? "Restaurant"
                )
                .padding(.horizontal, 20)

                Spacer().frame(height: 18)

                bottomSection
                    .padding(.bottom, 16)
            }
        }
    }

    // MARK: Top Section

    @ViewBuilder
    private var topSection: some View {
        HStack(alignment: .center, spacing: 12) {
            // Status icon + text
            HStack(spacing: 10) {
                Text(headerEmoji)
                    .font(.system(size: 44))

                VStack(alignment: .leading, spacing: 2) {
                    Text(headerTitle)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Text(headerSubtitle)
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.5))
                        .lineLimit(1)
                }
            }

            Spacer()

            // ETA or delivered badge
            if isDelivered {
                VStack(spacing: 2) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 26, weight: .bold))
                        .foregroundColor(.green)
                    Text("Delivered")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.green)
                }
                .frame(width: 70, height: 60)
                .background(Color.green.opacity(0.1))
                .cornerRadius(16)
            } else {
                ETABadge(
                    timerEndMs: contentState.timerEndDateInMilliseconds,
                    staticMinutes: data?.timeRemaining
                )
            }
        }
        .padding(.horizontal, 20)
    }

    // MARK: Bottom Section

    @ViewBuilder
    private var bottomSection: some View {
        if isDelivering, let phone = data?.courierPhone, !phone.isEmpty {
            // Courier row + call button
            HStack(spacing: 12) {
                CourierPhotoView(
                    photoFileName: data?.courierPhoto,
                    courierName: data?.courierName ?? "K",
                    size: 44
                )

                VStack(alignment: .leading, spacing: 1) {
                    Text(data?.courierName ?? "Courier")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Text(data?.distance ?? "On the way")
                        .font(.system(size: 11))
                        .foregroundColor(.green)
                        .lineLimit(1)
                }

                Spacer()

                if let url = URL(string: "tel:\(phone)") {
                    Link(destination: url) {
                        callButton
                    }
                }
            }
            .padding(.horizontal, 20)
        } else {
            // "Open App" pill
            if let url = URL(string: "delivery-app://order") {
                Link(destination: url) {
                    openAppButton
                }
                .padding(.horizontal, 20)
            }
        }
    }

    private var callButton: some View {
        HStack(spacing: 6) {
            Image(systemName: "phone.fill")
                .font(.system(size: 13, weight: .bold))
            Text("Call delivery person")
                .font(.system(size: 14, weight: .black))
        }
        .foregroundColor(.black)
        .frame(maxWidth: .infinity)
        .frame(height: 44)
        .background(Color(hex: "#007AFF"))
        .cornerRadius(22)
        .shadow(color: Color(hex: "#007AFF").opacity(0.4), radius: 8)
    }

    private var openAppButton: some View {
        HStack(spacing: 6) {
            Text("Open App")
                .font(.system(size: 14, weight: .black))
            Text("🍔")
                .font(.system(size: 14))
        }
        .foregroundColor(.black)
        .frame(maxWidth: .infinity)
        .frame(height: 44)
        .background(Color(hex: "#007AFF"))
        .cornerRadius(22)
        .shadow(color: Color(hex: "#007AFF").opacity(0.4), radius: 8)
    }
}

// MARK: - Local Color Helper

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

