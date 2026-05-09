#if os(iOS)
import SwiftUI

extension Date {
  static func toTimerInterval(miliseconds: Double) -> ClosedRange<Self> {
    Date() ... max(Date(), Date(timeIntervalSince1970: miliseconds / 1000))
  }
}
#endif
