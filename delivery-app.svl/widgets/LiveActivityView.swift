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
    var reservationTime: String?
    var courierRating: String?
    var mapThumbnail: String?
}

extension String {
    func toDeliveryData() -> DeliveryData? {
        guard let data = self.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(DeliveryData.self, from: data)
    }
}

// MARK: - Premium Timeline View

struct TimelineView: View {
    let status: Int // 1-5
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(1...4, id: \.self) { step in
                let isActive = step <= status
                let isLast = step == 4
                
                // Node
                ZStack {
                    Circle()
                        .fill(isActive ? Color(hex: "#007AFF") : Color.white.opacity(0.15))
                        .frame(width: 10, height: 10)
                    
                    if isActive {
                        Circle()
                            .stroke(Color(hex: "#007AFF").opacity(0.3), lineWidth: 4)
                            .frame(width: 16, height: 16)
                    }
                }
                
                // Connector
                if !isLast {
                    Rectangle()
                        .fill(step < status ? Color(hex: "#007AFF") : Color.white.opacity(0.15))
                        .frame(height: 3)
                        .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(.horizontal, 4)
    }
}

// MARK: - ETA Badge

private struct ETABadge: View {
    let timerEndMs: Double?
    let staticMinutes: String?

    var body: some View {
        VStack(spacing: 0) {
            if let ms = timerEndMs {
                let endDate = Date(timeIntervalSince1970: ms / 1000)
                Text(timerInterval: Date()...endDate, countsDown: true)
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundColor(Color(hex: "#007AFF"))
                    .monospacedDigit()
            } else {
                let mins = staticMinutes ?? ""
                Text(mins.isEmpty ? "--" : mins)
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundColor(Color(hex: "#007AFF"))
                    .monospacedDigit()
            }
            Text("MINS")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.white.opacity(0.4))
        }
        .frame(width: 50, height: 50)
        .background(
            Circle()
                .fill(Color.white.opacity(0.08))
                .overlay(Circle().stroke(Color.white.opacity(0.1), lineWidth: 1))
        )
    }
}

// MARK: - Main View

struct LiveActivityView: View {
    let contentState: LiveActivityAttributes.ContentState
    let attributes: LiveActivityAttributes

    private var data: DeliveryData? { contentState.subtitle?.toDeliveryData() }
    private var step: Int { 
        if let s = contentState.status { return s }
        return data?.currentStep ?? 1 
    }
    private var isEnRoute: Bool { step >= 4 }
    private var isDelivered: Bool { step >= 5 }

    private var statusEmoji: String {
        switch step {
        case 1: return "👨‍🍳"
        case 2: return "🍳"
        case 3: return "📦"
        case 4: return "🛵"
        case 5: return "🏠"
        default: return "🍔"
        }
    }

    private var statusTitle: String {
        switch step {
        case 1: return "Preparing"
        case 2: return "Cooking"
        case 3: return "Ready"
        case 4: return "En Route"
        case 5: return "Arrived"
        default: return "Delivery"
        }
    }

    var body: some View {
        VStack(spacing: 16) {
            // Header: Status + ETA
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(statusEmoji)
                            .font(.title2)
                        Text(statusTitle)
                            .font(.system(size: 20, weight: .black))
                            .foregroundColor(.white)
                    }
                    Text(contentState.restaurantName ?? data?.restaurantName ?? attributes.name)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.6))
                    
                    if let resTime = contentState.reservationTime ?? data?.reservationTime, !resTime.isEmpty, step < 3 {
                        Text("Ready by \(resTime)")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(Color(hex: "#007AFF"))
                            .padding(.top, 2)
                    }
                }
                
                Spacer()
                
                if isDelivered {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 32))
                        .foregroundColor(.green)
                        .shadow(color: .green.opacity(0.3), radius: 5)
                } else {
                    ETABadge(
                        timerEndMs: contentState.timerEndDateInMilliseconds,
                        staticMinutes: contentState.eta ?? data?.timeRemaining
                    )
                }
            }
            
            // Progress Section
            VStack(spacing: 8) {
                TimelineView(status: step)
                
                HStack {
                    Text("Order Placed").font(.caption2).foregroundColor(.white.opacity(0.4))
                    Spacer()
                    Text("Delivery").font(.caption2).foregroundColor(.white.opacity(0.4))
                }
            }
            
            // Dynamic Bottom Section
            let phone = contentState.courierPhone ?? data?.courierPhone ?? ""
            if step == 4 {
                HStack(spacing: 12) {
                    // Map Preview
                    RemoteThumbnailView(
                        fileName: contentState.mapThumbnail ?? data?.mapThumbnail,
                        width: 60,
                        height: 60
                    )
                    
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            CourierPhotoView(
                                photoFileName: contentState.courierPhoto ?? data?.courierPhoto,
                                courierName: contentState.courierName ?? data?.courierName ?? "K",
                                size: 24
                            )
                            
                            Text(contentState.courierName ?? data?.courierName ?? "Courier")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                            
                            if let rating = contentState.courierRating ?? data?.courierRating {
                                Text("\(rating) ★")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.yellow)
                            }
                        }
                        
                        Text(contentState.eta ?? data?.distance ?? "Arriving soon")
                            .font(.system(size: 12))
                            .foregroundColor(.green)
                    }
                    
                    Spacer()
                    
                    if !phone.isEmpty {
                        if #available(iOS 17.0, *) {
                            Button(intent: CallIntent(phoneNumber: phone.replacingOccurrences(of: " ", with: ""))) {
                                Image(systemName: "phone.fill")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(12)
                                    .background(Circle().fill(Color.blue))
                            }
                            .buttonStyle(.plain)
                        } else {
                            if let url = URL(string: "tel:\(phone.replacingOccurrences(of: " ", with: ""))") {
                                Link(destination: url) {
                                    Image(systemName: "phone.fill")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.white)
                                        .padding(12)
                                        .background(Circle().fill(Color.blue))
                                }
                            }
                        }
                    }
                }
                .padding(8)
                .background(RoundedRectangle(cornerRadius: 12).fill(Color.white.opacity(0.05)))
            } else {
                Link(destination: URL(string: "delivery-app://order")!) {
                    HStack {
                        Text(isDelivered ? "Rate Order" : "View Order Details")
                            .font(.system(size: 14, weight: .bold))
                        Image(systemName: "arrow.right.circle.fill")
                    }
                    .foregroundColor(.white)
                    .padding(.vertical, 8)
                    .padding(.horizontal, 16)
                    .background(Capsule().fill(Color.white.opacity(0.1)))
                }
            }
        }
        .padding(16)
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

