import SwiftUI

private enum PawPairWatchPalette {
  static let navy = Color(red: 7 / 255, green: 22 / 255, blue: 58 / 255)
  static let navyRaised = Color(red: 17 / 255, green: 35 / 255, blue: 73 / 255)
  static let cream = Color(red: 1, green: 248 / 255, blue: 236 / 255)
  static let coral = Color(red: 235 / 255, green: 111 / 255, blue: 83 / 255)
  static let sage = Color(red: 72 / 255, green: 145 / 255, blue: 132 / 255)
}

struct CareHomeView: View {
  @EnvironmentObject private var store: WatchCareStore
  @State private var completionFeedback = 0
  @State private var skipFeedback = 0

  private var actionableItems: [WatchCareItem] {
    store.snapshot.items.filter {
      $0.status != "done" && $0.status != "skipped"
    }
  }

  private var completedCount: Int {
    store.snapshot.items.filter { $0.status == "done" }.count
  }

  var body: some View {
    Group {
      if store.snapshot.items.isEmpty {
        emptyState
      } else {
        TabView {
          overviewPage

          ForEach(actionableItems.prefix(8)) { item in
            CareMomentPage(
              item: item,
              isPending: store.pendingIds.contains(item.id),
              onDone: { complete(item) },
              onSkip: { skip(item) }
            )
          }
        }
        .tabViewStyle(.verticalPage)
      }
    }
    .background(PawPairWatchPalette.navy.ignoresSafeArea())
    .tint(PawPairWatchPalette.coral)
    .sensoryFeedback(.success, trigger: completionFeedback)
    .sensoryFeedback(.selection, trigger: skipFeedback)
  }

  private var overviewPage: some View {
    VStack(spacing: 10) {
      watchHeader

      HStack(spacing: 12) {
        ProgressPaw(
          completed: completedCount,
          total: store.snapshot.items.count
        )

        VStack(alignment: .leading, spacing: 2) {
          Text("TODAY")
            .font(.system(size: 9, weight: .bold, design: .rounded))
            .tracking(1.1)
            .foregroundStyle(PawPairWatchPalette.coral)
          Text(summaryTitle)
            .font(.system(size: 17, weight: .bold, design: .rounded))
            .foregroundStyle(PawPairWatchPalette.cream)
            .contentTransition(.numericText())
          Text(summaryDetail)
            .font(.caption2)
            .foregroundStyle(PawPairWatchPalette.cream.opacity(0.65))
            .lineLimit(1)
        }

        Spacer(minLength: 0)
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      if let next = actionableItems.first {
        Button {
          complete(next)
        } label: {
          HStack(spacing: 10) {
            Image(systemName: symbol(for: next.category))
              .font(.system(size: 17, weight: .bold))
              .foregroundStyle(PawPairWatchPalette.coral)
              .frame(width: 32, height: 32)
              .background(PawPairWatchPalette.coral.opacity(0.15), in: Circle())

            VStack(alignment: .leading, spacing: 2) {
              Text(next.status == "missed" ? "Needs attention" : "Next up")
                .font(.system(size: 9, weight: .bold, design: .rounded))
                .foregroundStyle(PawPairWatchPalette.coral)
              Text(next.title)
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(PawPairWatchPalette.navy)
                .lineLimit(1)
              Text(next.time)
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(PawPairWatchPalette.navy.opacity(0.58))
                .lineLimit(1)
            }

            Spacer(minLength: 2)

            Image(systemName: "checkmark.circle.fill")
              .font(.system(size: 23, weight: .semibold))
              .foregroundStyle(PawPairWatchPalette.sage)
              .symbolEffect(.bounce, value: completionFeedback)
          }
          .padding(10)
          .frame(maxWidth: .infinity)
          .background(PawPairWatchPalette.cream, in: RoundedRectangle(cornerRadius: 18))
        }
        .buttonStyle(.plain)
        .disabled(store.pendingIds.contains(next.id))
        .accessibilityLabel("Mark \(next.title) done")
        .accessibilityHint("Updates PawPair on your iPhone")
      } else {
        Label("Everything is cared for", systemImage: "checkmark.seal.fill")
          .font(.system(size: 12, weight: .bold, design: .rounded))
          .foregroundStyle(PawPairWatchPalette.sage)
          .padding(.vertical, 12)
          .frame(maxWidth: .infinity)
          .background(PawPairWatchPalette.cream, in: RoundedRectangle(cornerRadius: 18))
      }

      syncStatus
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 5)
  }

  private var watchHeader: some View {
    HStack(spacing: 6) {
      Image(systemName: "pawprint.fill")
        .foregroundStyle(PawPairWatchPalette.coral)
      Text(store.snapshot.items.first?.petName ?? "PawPair")
        .font(.system(size: 12, weight: .bold, design: .rounded))
        .foregroundStyle(PawPairWatchPalette.cream)
        .lineLimit(1)
      Spacer()
      Text("\(actionableItems.count)")
        .font(.system(size: 11, weight: .bold, design: .rounded))
        .contentTransition(.numericText())
        .foregroundStyle(PawPairWatchPalette.cream)
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(PawPairWatchPalette.navyRaised, in: Capsule())
        .accessibilityLabel("\(actionableItems.count) care moments remaining")
    }
  }

  private var syncStatus: some View {
    Label(
      store.pendingIds.isEmpty ? "Up to date" : "Syncing with iPhone",
      systemImage: store.pendingIds.isEmpty
        ? "checkmark.icloud.fill"
        : "arrow.triangle.2.circlepath"
    )
    .font(.system(size: 9, weight: .semibold, design: .rounded))
    .foregroundStyle(PawPairWatchPalette.cream.opacity(0.58))
    .symbolEffect(
      .variableColor,
      options: store.pendingIds.isEmpty ? .default : .repeating,
      isActive: !store.pendingIds.isEmpty
    )
  }

  private var emptyState: some View {
    VStack(spacing: 7) {
      HStack(spacing: 6) {
        Image(systemName: "pawprint.fill")
          .foregroundStyle(PawPairWatchPalette.coral)
        Text("PawPair")
        Spacer()
      }
      .font(.system(size: 12, weight: .bold, design: .rounded))
      .foregroundStyle(PawPairWatchPalette.cream)

      ZStack {
        Circle()
          .fill(PawPairWatchPalette.coral.opacity(0.16))
          .frame(width: 50, height: 50)
        Circle()
          .stroke(PawPairWatchPalette.coral.opacity(0.28), lineWidth: 1)
          .frame(width: 50, height: 50)
        Image(systemName: "pawprint.fill")
          .font(.system(size: 21, weight: .bold))
          .foregroundStyle(PawPairWatchPalette.coral)
      }

      Text("Care on your wrist")
        .font(.system(size: 17, weight: .bold, design: .rounded))
        .foregroundStyle(PawPairWatchPalette.cream)
        .lineLimit(1)
        .minimumScaleFactor(0.78)

      Text(
        store.snapshot.generatedAt.isEmpty
          ? "Open PawPair on iPhone\nto sync today’s plan."
          : "You’re all caught up."
      )
      .font(.system(size: 10, weight: .medium, design: .rounded))
      .foregroundStyle(PawPairWatchPalette.cream.opacity(0.68))
      .multilineTextAlignment(.center)
      .lineLimit(2)
      .fixedSize(horizontal: false, vertical: true)
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 6)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  private var summaryTitle: String {
    actionableItems.isEmpty ? "All done" : "\(actionableItems.count) remaining"
  }

  private var summaryDetail: String {
    actionableItems.isEmpty
      ? "Care complete for today"
      : "Crown for details"
  }

  private func complete(_ item: WatchCareItem) {
    completionFeedback += 1
    store.mark(item, status: "done")
  }

  private func skip(_ item: WatchCareItem) {
    skipFeedback += 1
    store.mark(item, status: "skipped")
  }
}

private struct ProgressPaw: View {
  let completed: Int
  let total: Int

  private var progress: Double {
    guard total > 0 else { return 0 }
    return Double(completed) / Double(total)
  }

  var body: some View {
    ZStack {
      Circle()
        .stroke(PawPairWatchPalette.cream.opacity(0.11), lineWidth: 5)
      Circle()
        .trim(from: 0, to: progress)
        .stroke(
          AngularGradient(
            colors: [PawPairWatchPalette.coral, PawPairWatchPalette.sage],
            center: .center
          ),
          style: StrokeStyle(lineWidth: 5, lineCap: .round)
        )
        .rotationEffect(.degrees(-90))
        .animation(.snappy, value: progress)
      Image(systemName: progress >= 1 ? "checkmark" : "pawprint.fill")
        .font(.system(size: 16, weight: .bold))
        .foregroundStyle(
          progress >= 1 ? PawPairWatchPalette.sage : PawPairWatchPalette.cream
        )
    }
    .frame(width: 48, height: 48)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(completed) of \(total) care moments complete")
  }
}

private struct CareMomentPage: View {
  let item: WatchCareItem
  let isPending: Bool
  let onDone: () -> Void
  let onSkip: () -> Void

  var body: some View {
    VStack(spacing: 9) {
      HStack {
        Label(item.petName, systemImage: "pawprint.fill")
          .font(.system(size: 11, weight: .bold, design: .rounded))
          .foregroundStyle(PawPairWatchPalette.cream.opacity(0.78))
          .lineLimit(1)
        Spacer()
        Text(statusLabel)
          .font(.system(size: 9, weight: .bold, design: .rounded))
          .foregroundStyle(statusColor)
          .padding(.horizontal, 7)
          .padding(.vertical, 3)
          .background(statusColor.opacity(0.14), in: Capsule())
      }

      VStack(alignment: .leading, spacing: 7) {
        HStack(alignment: .top, spacing: 9) {
          Image(systemName: symbol(for: item.category))
            .font(.system(size: 18, weight: .bold))
            .foregroundStyle(PawPairWatchPalette.sage)
            .frame(width: 34, height: 34)
            .background(PawPairWatchPalette.sage.opacity(0.13), in: Circle())

          VStack(alignment: .leading, spacing: 2) {
            Text(item.title)
              .font(.system(size: 15, weight: .bold, design: .rounded))
              .foregroundStyle(PawPairWatchPalette.navy)
              .lineLimit(2)
            Text(item.time)
              .font(.caption2.monospacedDigit().weight(.semibold))
              .foregroundStyle(PawPairWatchPalette.navy.opacity(0.58))
              .lineLimit(1)
          }
          Spacer(minLength: 0)
        }

        if !item.instructions.isEmpty {
          Text(item.instructions)
            .font(.caption2)
            .foregroundStyle(PawPairWatchPalette.navy.opacity(0.68))
            .lineLimit(2)
        }

        HStack(spacing: 7) {
          Button(action: onDone) {
            Label("Done", systemImage: "checkmark")
              .frame(maxWidth: .infinity)
          }
          .buttonStyle(.borderedProminent)
          .tint(PawPairWatchPalette.coral)
          .accessibilityHint("Updates PawPair on your iPhone")

          Button(action: onSkip) {
            Image(systemName: "forward.end.fill")
              .frame(width: 25)
          }
          .buttonStyle(.bordered)
          .tint(PawPairWatchPalette.navy)
          .accessibilityLabel("Skip \(item.title)")
        }
        .font(.caption.weight(.bold))
        .disabled(isPending)
        .opacity(isPending ? 0.55 : 1)
      }
      .padding(11)
      .background(PawPairWatchPalette.cream, in: RoundedRectangle(cornerRadius: 18))

      Label(
        isPending ? "Syncing change" : "Turn the Crown for the next item",
        systemImage: isPending ? "arrow.triangle.2.circlepath" : "digitalcrown.arrow.clockwise"
      )
      .font(.system(size: 9, weight: .semibold, design: .rounded))
      .foregroundStyle(PawPairWatchPalette.cream.opacity(0.54))
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 5)
  }

  private var statusLabel: String {
    if isPending { return "SYNC" }
    switch item.status {
    case "missed": return "MISSED"
    case "due": return "NOW"
    default: return "NEXT"
    }
  }

  private var statusColor: Color {
    item.status == "missed" ? .red : PawPairWatchPalette.coral
  }
}

private func symbol(for category: String) -> String {
  switch category {
  case "medication": "pills.fill"
  case "feeding": "fork.knife"
  case "walk": "figure.walk"
  case "water": "drop.fill"
  case "appointment": "cross.case.fill"
  default: "heart.fill"
  }
}
