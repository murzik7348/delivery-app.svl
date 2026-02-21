import ActivityKit
import SwiftUI
import WidgetKit

#if canImport(ActivityKit)

  struct RideData: Codable {
      var driverName: String?
      var carModel: String?
      var time: String?
      var distance: String?
      var startAddress: String?
      var endAddress: String?
      var paymentInfo: String?
  }

  extension String {
      func toRideData() -> RideData? {
          guard let data = self.data(using: .utf8) else { return nil }
          do {
              return try JSONDecoder().decode(RideData.self, from: data)
          } catch {
              return nil
          }
      }
  }

  struct ConditionalForegroundViewModifier: ViewModifier {
    let color: String?

    func body(content: Content) -> some View {
      if let color = color {
        content.foregroundStyle(Color(hex: color))
      } else {
        content
      }
    }
  }

  struct LiveActivityView: View {
    let contentState: LiveActivityAttributes.ContentState
    let attributes: LiveActivityAttributes

    var body: some View {
      let rideData = contentState.subtitle?.toRideData()
      
      VStack(spacing: 0) {
        // TOP SECTION: Driver & Car Info, Time & Distance
        HStack(alignment: .top) {
          // Driver Avatar / Car Icon Wrapper
          ZStack {
            Circle()
              .fill(Color(hex: "#5C4DFF") ?? Color.purple)
              .frame(width: 48, height: 48)
            Image(systemName: "car.fill") // Fallback car
              .font(.system(size: 20))
              .foregroundColor(.yellow)
          }
          
          VStack(alignment: .leading, spacing: 2) {
            Text(rideData?.driverName ?? "4ABC123")
              .font(.headline)
              .fontWeight(.bold)
              .foregroundColor(.white)
            Text(rideData?.carModel ?? "Mercedes-Benz")
              .font(.subheadline)
              .foregroundColor(.gray)
          }
          .padding(.leading, 8)
          
          Spacer()
          
          // Time & Distance
          VStack(alignment: .trailing, spacing: 2) {
            Text(rideData?.time ?? "24 min")
              .font(.headline)
              .fontWeight(.bold)
              .foregroundColor(.white)
            Text(rideData?.distance ?? "4,5 km")
              .font(.subheadline)
              .foregroundColor(.gray)
          }
        }
        .padding(.top, 24)
        .padding(.horizontal, 24)
        
        Spacer().frame(height: 28)
        
        // TIMELINE SECTION
        HStack(alignment: .top, spacing: 16) {
           // Timeline graphic (vertical dashed line with dots)
           VStack(spacing: 0) {
               // Start dot (Green)
               ZStack {
                   Circle().fill(Color(hex: "#0F0F0F") ?? .black).frame(width: 14, height: 14)
                   Circle().stroke(Color.green, lineWidth: 2).frame(width: 14, height: 14)
                   Circle().fill(Color.green).frame(width: 6, height: 6)
               }
               
               // Dotted Line
               Path { path in
                   path.move(to: CGPoint(x: 7, y: 0))
                   path.addLine(to: CGPoint(x: 7, y: 36))
               }
               .stroke(Color.gray.opacity(0.5), style: StrokeStyle(lineWidth: 1.5, dash: [4, 4]))
               .frame(width: 14, height: 36)
               
               // End dot (Gray)
               ZStack {
                   Circle().fill(Color(hex: "#0F0F0F") ?? .black).frame(width: 14, height: 14)
                   Circle().fill(Color.gray.opacity(0.7)).frame(width: 8, height: 8)
               }
           }
           .padding(.top, 4)
           
           // Addresses
           VStack(alignment: .leading, spacing: 18) {
               // Start Address
               VStack(alignment: .leading, spacing: 2) {
                   Text("From")
                       .font(.system(size: 11, weight: .bold))
                       .foregroundColor(Color(hex: "#FF5C00") ?? .orange)
                   Text(rideData?.startAddress ?? "2647 Grand Avenue")
                       .font(.system(size: 15, weight: .bold))
                       .foregroundColor(.white)
               }
               
               // End Address
               VStack(alignment: .leading, spacing: 2) {
                   Text("To")
                       .font(.system(size: 11, weight: .bold))
                       .foregroundColor(.gray)
                   Text(rideData?.endAddress ?? "2341 Oakdale Avenue")
                       .font(.system(size: 15, weight: .bold))
                       .foregroundColor(.white)
               }
           }
           Spacer()
        }
        .padding(.horizontal, 28)
        
        Spacer().frame(height: 36)
        
        // BOTTOM BUTTONS SECTION
        HStack(spacing: 12) {
            // Call Button
            Button(action: {}) {
                ZStack {
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color(hex: "#2C2C2E") ?? Color.gray.opacity(0.3))
                        .frame(width: 52, height: 42)
                    Image(systemName: "phone")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                }
            }
            
            // Message Button
            Button(action: {}) {
                ZStack {
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color(hex: "#2C2C2E") ?? Color.gray.opacity(0.3))
                        .frame(width: 52, height: 42)
                    Image(systemName: "message.fill")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(Color.gray.opacity(0.8))
                }
            }
            
            Spacer()
            
            // Payment Button (Mastercard generic)
            Button(action: {}) {
                ZStack {
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color(hex: "#2C2C2E") ?? Color.gray.opacity(0.3))
                        .frame(height: 42)
                    
                    HStack(spacing: 6) {
                        // Mastercard overlap circles
                        ZStack {
                            Circle().fill(Color.red).frame(width: 14, height: 14).offset(x: -5)
                            Circle().fill(Color.orange).frame(width: 14, height: 14).offset(x: 5)
                        }
                        .padding(.trailing, 6)
                        
                        Text("•••• " + (rideData?.paymentInfo ?? "1234"))
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.gray)
                    }
                    .padding(.horizontal, 16)
                }
            }
            // Let the button intrinsic size adjust to content
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 24)
      }
      .background(Color(hex: "#0F0F0F") ?? Color.black)
    }
  }

#endif
