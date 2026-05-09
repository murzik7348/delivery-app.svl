#if os(iOS)
import SwiftUI

#if canImport(UIKit)
import UIKit

// MARK: - Courier Photo
// Reads a pre-downloaded photo from the App Group container.
// The React Native side downloads the URL and saves the file there
// before calling startActivity / updateActivity.
struct CourierPhotoView: View {
    let photoFileName: String?
    let courierName: String
    let size: CGFloat

    private var cachedImage: UIImage? {
        guard let fn = photoFileName, !fn.isEmpty else { return nil }
        return UIImage.dynamic(assetNameOrPath: fn)
    }

    var body: some View {
        Group {
            if let img = cachedImage {
                Image(uiImage: img)
                    .resizable()
                    .scaledToFill()
            } else {
                fallbackView
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(Color.white.opacity(0.25), lineWidth: 1.5))
        .shadow(color: Color.black.opacity(0.3), radius: 4)
    }

    private var fallbackView: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#1c92d2"), Color(hex: "#00c875")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            Text(String((courierName.first ?? "K")).uppercased())
                .font(.system(size: size * 0.42, weight: .black, design: .rounded))
                .foregroundColor(.white)
        }
    }
}
#else
struct CourierPhotoView: View {
    let photoFileName: String?
    let courierName: String
    let size: CGFloat

    var body: some View {
        ZStack {
            Color.gray
            Text(String((courierName.first ?? "K")).uppercased())
                .foregroundColor(.white)
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }
}
#endif

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
