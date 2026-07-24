import SwiftUI

private enum PawPairWatchPalette {
  static let navy = Color(red: 7 / 255, green: 22 / 255, blue: 58 / 255)
  static let cream = Color(red: 1, green: 248 / 255, blue: 236 / 255)
  static let coral = Color(red: 235 / 255, green: 111 / 255, blue: 83 / 255)
  static let sage = Color(red: 72 / 255, green: 145 / 255, blue: 132 / 255)
}

struct CareHomeView: View {
  @EnvironmentObject private var store: WatchCareStore

  var body: some View {
    NavigationStack {
      Group {
        if store.snapshot.items.isEmpty {
          emptyState
        } else {
          careList
        }
      }
      .background(PawPairWatchPalette.navy.ignoresSafeArea())
      .navigationTitle("PawPair")
      .navigationBarTitleDisplayMode(.inline)
    }
    .tint(PawPairWatchPalette.coral)
  }

  private var emptyState: some View {
    VStack(spacing: 10) {
      ZStack {
        Circle()
          .fill(PawPairWatchPalette.coral.opacity(0.18))
          .frame(width: 54, height: 54)
        Image(systemName: "pawprint.fill")
          .font(.system(size: 23, weight: .bold))
          .foregroundStyle(PawPairWatchPalette.coral)
      }
      Text("Ready when they are")
        .font(.headline)
        .foregroundStyle(PawPairWatchPalette.cream)
        .multilineTextAlignment(.center)
      Text("Open PawPair on iPhone to sync the care you create.")
        .font(.caption2)
        .foregroundStyle(PawPairWatchPalette.cream.opacity(0.72))
        .multilineTextAlignment(.center)
    }
    .padding(.horizontal, 16)
  }

  private var careList: some View {
    ScrollView {
      LazyVStack(spacing: 10) {
        if let petName = store.snapshot.items.first?.petName {
          HStack(spacing: 7) {
            Image(systemName: "pawprint.fill")
              .foregroundStyle(PawPairWatchPalette.coral)
            Text(petName)
              .font(.headline)
              .foregroundStyle(PawPairWatchPalette.cream)
            Spacer()
          }
          .padding(.horizontal, 4)
        }

        ForEach(store.snapshot.items) { item in
          CareMomentCard(
            item: item,
            isPending: store.pendingIds.contains(item.id),
            onDone: { store.mark(item, status: "done") },
            onSkip: { store.mark(item, status: "skipped") }
          )
        }
      }
      .padding(.horizontal, 4)
      .padding(.bottom, 12)
    }
  }
}

private struct CareMomentCard: View {
  let item: WatchCareItem
  let isPending: Bool
  let onDone: () -> Void
  let onSkip: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 9) {
      HStack(alignment: .top, spacing: 8) {
        Image(systemName: symbol)
          .font(.system(size: 15, weight: .bold))
          .foregroundStyle(PawPairWatchPalette.sage)
          .frame(width: 28, height: 28)
          .background(PawPairWatchPalette.sage.opacity(0.13), in: Circle())
        VStack(alignment: .leading, spacing: 2) {
          Text(item.title)
            .font(.system(size: 14, weight: .bold, design: .rounded))
            .foregroundStyle(PawPairWatchPalette.navy)
            .lineLimit(2)
          Text(item.time)
            .font(.caption2.monospacedDigit().weight(.semibold))
            .foregroundStyle(PawPairWatchPalette.navy.opacity(0.58))
        }
        Spacer(minLength: 2)
        Text(statusLabel)
          .font(.system(size: 9, weight: .bold, design: .rounded))
          .foregroundStyle(statusColor)
          .padding(.horizontal, 7)
          .padding(.vertical, 4)
          .background(statusColor.opacity(0.12), in: Capsule())
      }

      if !item.instructions.isEmpty {
        Text(item.instructions)
          .font(.caption2)
          .foregroundStyle(PawPairWatchPalette.navy.opacity(0.7))
          .lineLimit(2)
      }

      HStack(spacing: 7) {
        Button(action: onDone) {
          Label("Done", systemImage: "checkmark")
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .tint(PawPairWatchPalette.coral)

        Button(action: onSkip) {
          Image(systemName: "forward.end.fill")
            .frame(width: 24)
        }
        .buttonStyle(.bordered)
        .tint(PawPairWatchPalette.navy)
      }
      .font(.caption.weight(.bold))
      .disabled(isPending || item.status == "done" || item.status == "skipped")
      .opacity(isPending ? 0.55 : 1)
    }
    .padding(11)
    .background(PawPairWatchPalette.cream, in: RoundedRectangle(cornerRadius: 18))
  }

  private var statusLabel: String {
    switch item.status {
    case "done": "DONE"
    case "missed": "MISSED"
    case "due": "NOW"
    case "skipped": "SKIPPED"
    default: "NEXT"
    }
  }

  private var statusColor: Color {
    item.status == "missed" ? .red : PawPairWatchPalette.coral
  }

  private var symbol: String {
    switch item.category {
    case "medication": "pills.fill"
    case "feeding": "fork.knife"
    case "walk": "figure.walk"
    case "water": "drop.fill"
    case "appointment": "cross.case.fill"
    default: "heart.fill"
    }
  }
}
