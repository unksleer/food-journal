import WidgetKit
import SwiftUI

// Home-screen widget for Fuel Tracker. Built by the FuelWidgetExtension target, which reads
// today's numbers from the App Group the app writes through WidgetBridgePlugin.

private let appGroup = "group.com.leeunks.ketojournal"
private let snapshotKey = "today"

struct Snapshot: Codable {
    var date: String
    var proteinKcal: Int
    var proteinGoal: Int
    var netCarbs: Int
    var carbLimit: Int
    var streak: Int
    var inKetosis: Bool
    var updatedAt: Double

    static let placeholder = Snapshot(date: "", proteinKcal: 440, proteinGoal: 950, netCarbs: 14, carbLimit: 40, streak: 6, inKetosis: true, updatedAt: 0)

    static func load() -> Snapshot? {
        guard let raw = UserDefaults(suiteName: appGroup)?.string(forKey: snapshotKey),
              let data = raw.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Snapshot.self, from: data)
    }

    var isToday: Bool {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date()) == date
    }
}

struct FuelEntry: TimelineEntry {
    let date: Date
    let snapshot: Snapshot?
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> FuelEntry { FuelEntry(date: Date(), snapshot: .placeholder) }

    func getSnapshot(in context: Context, completion: @escaping (FuelEntry) -> Void) {
        completion(FuelEntry(date: Date(), snapshot: context.isPreview ? .placeholder : Snapshot.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FuelEntry>) -> Void) {
        let entry = FuelEntry(date: Date(), snapshot: Snapshot.load())
        // Refresh after midnight so a stale day shows as empty; the app reloads it on every log.
        let tomorrow = Calendar.current.startOfDay(for: Date()).addingTimeInterval(86_400 + 60)
        completion(Timeline(entries: [entry], policy: .after(tomorrow)))
    }
}

private let terracotta = Color(red: 0.76, green: 0.25, blue: 0.05)
private let carbBlue = Color(red: 0.15, green: 0.39, blue: 0.92)
private let ink = Color(red: 0.18, green: 0.15, blue: 0.13)
private let muted = Color(red: 0.54, green: 0.35, blue: 0.24)
private let cream = Color(red: 0.98, green: 0.97, blue: 0.95)

struct Bar: View {
    let value: Double
    let max: Double
    let tint: Color
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(tint.opacity(0.15))
                Capsule().fill(tint).frame(width: g.size.width * CGFloat(min(1, max > 0 ? value / max : 0)))
            }
        }
        .frame(height: 8)
    }
}

struct SmallView: View {
    let s: Snapshot
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("CARBS LEFT").font(.caption2.weight(.bold)).foregroundColor(muted)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(Swift.max(0, s.carbLimit - s.netCarbs))").font(.system(size: 40, weight: .heavy)).foregroundColor(ink)
                Text("g").font(.headline).foregroundColor(carbBlue)
            }
            Bar(value: Double(s.netCarbs), max: Double(s.carbLimit), tint: carbBlue)
            Spacer(minLength: 0)
            HStack {
                Text("Protein \(s.proteinKcal)/\(s.proteinGoal)").font(.caption.weight(.semibold)).foregroundColor(muted)
                Spacer()
                if s.streak > 0 {
                    HStack(spacing: 2) { Image(systemName: "flame.fill"); Text("\(s.streak)") }.font(.caption.weight(.bold)).foregroundColor(terracotta)
                }
            }
        }
    }
}

struct MediumView: View {
    let s: Snapshot
    var body: some View {
        HStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 6) {
                Text("NET CARBS").font(.caption2.weight(.bold)).foregroundColor(muted)
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("\(s.netCarbs)").font(.system(size: 34, weight: .heavy)).foregroundColor(ink)
                    Text("/ \(s.carbLimit) g").font(.subheadline.weight(.semibold)).foregroundColor(muted)
                }
                Bar(value: Double(s.netCarbs), max: Double(s.carbLimit), tint: carbBlue)
            }
            VStack(alignment: .leading, spacing: 6) {
                Text("PROTEIN").font(.caption2.weight(.bold)).foregroundColor(muted)
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("\(s.proteinKcal)").font(.system(size: 34, weight: .heavy)).foregroundColor(ink)
                    Text("/ \(s.proteinGoal)").font(.subheadline.weight(.semibold)).foregroundColor(muted)
                }
                Bar(value: Double(s.proteinKcal), max: Double(s.proteinGoal), tint: terracotta)
                HStack(spacing: 8) {
                    if s.inKetosis { Label("In ketosis", systemImage: "flame.fill").font(.caption.weight(.semibold)).foregroundColor(Color(red: 0.06, green: 0.73, blue: 0.51)) }
                    if s.streak > 0 { Text("\(s.streak)-day streak").font(.caption.weight(.semibold)).foregroundColor(terracotta) }
                }
            }
        }
    }
}

struct NothingLoggedView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Fuel Tracker").font(.headline).foregroundColor(ink)
            Text("Nothing logged today. Tap to add your first meal.").font(.caption).foregroundColor(muted)
            Spacer(minLength: 0)
        }
    }
}

struct FuelWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: FuelEntry

    var body: some View {
        Group {
            if let s = entry.snapshot, s.isToday || s.updatedAt == 0 {
                if family == .systemMedium { MediumView(s: s) } else { SmallView(s: s) }
            } else {
                NothingLoggedView()
            }
        }
        .padding(14)
        .widgetBackgroundCompat(cream)
    }
}

extension View {
    @ViewBuilder
    func widgetBackgroundCompat(_ color: Color) -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget) { color }
        } else {
            self.background(color)
        }
    }
}

@main
struct FuelWidget: Widget {
    let kind: String = "FuelWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            FuelWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Fuel Tracker")
        .description("Net carbs left and protein progress for today.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
