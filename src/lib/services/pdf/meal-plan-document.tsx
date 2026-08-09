import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { branding } from "@/config/branding";
import type { GroceryCategory } from "@/types/database";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#2b2620" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 },
  brand: { fontSize: 14, fontWeight: 700, color: "#3a6650" },
  title: { fontSize: 18, fontWeight: 700, marginTop: 12, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#6b6357", marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginTop: 18, marginBottom: 8, color: "#3a6650" },
  targetsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 6 },
  targetPill: { backgroundColor: "#f2ede1", borderRadius: 4, paddingVertical: 4, paddingHorizontal: 8, fontSize: 9 },
  dayHeading: { fontSize: 13, fontWeight: 700, marginTop: 16, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#ddd6c7", paddingBottom: 4 },
  meal: { marginBottom: 10, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: "#e8e3d6" },
  mealHeaderRow: { flexDirection: "row", justifyContent: "space-between" },
  mealType: { fontSize: 8, textTransform: "uppercase", color: "#8a8270", letterSpacing: 0.5 },
  mealName: { fontSize: 11, fontWeight: 700, marginTop: 1 },
  mealCalories: { fontSize: 9, color: "#6b6357" },
  ingredientLine: { fontSize: 9, marginTop: 3, marginLeft: 4 },
  prepText: { fontSize: 9, marginTop: 3, color: "#4a453b", fontStyle: "italic" },
  dayTotalsRow: { flexDirection: "row", gap: 12, marginTop: 4, marginBottom: 2, backgroundColor: "#f6f3ea", padding: 6, borderRadius: 4 },
  totalLabel: { fontSize: 8, color: "#6b6357" },
  totalValue: { fontSize: 10, fontWeight: 700 },
  groceryCategory: { fontSize: 10, fontWeight: 700, marginTop: 8, marginBottom: 3 },
  groceryItem: { fontSize: 9, marginBottom: 2 },
  notesBox: { backgroundColor: "#f6f3ea", padding: 10, borderRadius: 4, fontSize: 9.5, lineHeight: 1.4 },
  disclaimer: { fontSize: 7.5, color: "#8a8270", marginTop: 24, lineHeight: 1.4, borderTopWidth: 0.5, borderTopColor: "#ddd6c7", paddingTop: 8 },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 7.5, color: "#a39c8c", textAlign: "center" },
});

export type PdfMealItem = { name: string; quantity: number; unit: string };
export type PdfMeal = {
  mealType: string;
  name: string;
  prepInstructions: string | null;
  items: PdfMealItem[];
  totals: { calories: number; proteinG: number; carbsG: number; fatG: number };
};
export type PdfDay = {
  dayNumber: number;
  meals: PdfMeal[];
  totals: { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number; sodiumMg: number };
};
export type PdfGroceryGroup = { category: GroceryCategory; items: { name: string; quantity: number | null; unit: string | null }[] };

export type MealPlanPdfProps = {
  patientFirstName: string;
  planName: string;
  startDate: string | null;
  numDays: number;
  targets: {
    calories?: number | null;
    proteinG?: number | null;
    carbsG?: number | null;
    fatG?: number | null;
    fiberG?: number | null;
    sodiumMg?: number | null;
  } | null;
  days: PdfDay[];
  groceryGroups: PdfGroceryGroup[];
  messageToPatient?: string;
};

const CATEGORY_LABELS: Record<GroceryCategory, string> = {
  produce: "Produce",
  meat_seafood: "Meat & Seafood",
  dairy: "Dairy",
  grains: "Grains",
  pantry: "Pantry",
  frozen: "Frozen",
  spices_seasonings: "Spices & Seasonings",
  other: "Other",
};

export function MealPlanPdfDocument({
  patientFirstName,
  planName,
  startDate,
  numDays,
  targets,
  days,
  groceryGroups,
  messageToPatient,
}: MealPlanPdfProps) {
  return (
    <Document title={`${planName} — ${branding.appName}`}>
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>{branding.appName}</Text>
          {startDate && <Text style={styles.subtitle}>Starting {startDate}</Text>}
        </View>
        <Text style={styles.title}>{planName}</Text>
        <Text style={styles.subtitle}>
          Prepared for {patientFirstName} · {numDays}-day plan
        </Text>

        {targets && (
          <View>
            <Text style={styles.sectionTitle}>Daily Nutrition Targets</Text>
            <View style={styles.targetsRow}>
              {targets.calories != null && <Text style={styles.targetPill}>Calories: {targets.calories}</Text>}
              {targets.proteinG != null && <Text style={styles.targetPill}>Protein: {targets.proteinG}g</Text>}
              {targets.carbsG != null && <Text style={styles.targetPill}>Carbs: {targets.carbsG}g</Text>}
              {targets.fatG != null && <Text style={styles.targetPill}>Fat: {targets.fatG}g</Text>}
              {targets.fiberG != null && <Text style={styles.targetPill}>Fiber: {targets.fiberG}g</Text>}
              {targets.sodiumMg != null && <Text style={styles.targetPill}>Sodium: {targets.sodiumMg}mg</Text>}
            </View>
          </View>
        )}

        {messageToPatient && (
          <View>
            <Text style={styles.sectionTitle}>A Note From Your Dietitian</Text>
            <View style={styles.notesBox}>
              <Text>{messageToPatient}</Text>
            </View>
          </View>
        )}

        {days.map((day) => (
          <View key={day.dayNumber} wrap={false}>
            <Text style={styles.dayHeading}>Day {day.dayNumber}</Text>
            {day.meals.map((meal, idx) => (
              <View key={idx} style={styles.meal}>
                <View style={styles.mealHeaderRow}>
                  <View>
                    <Text style={styles.mealType}>{meal.mealType}</Text>
                    <Text style={styles.mealName}>{meal.name}</Text>
                  </View>
                  <Text style={styles.mealCalories}>{meal.totals.calories} kcal</Text>
                </View>
                {meal.items.map((item, itemIdx) => (
                  <Text key={itemIdx} style={styles.ingredientLine}>
                    • {item.name} — {item.quantity} {item.unit}
                  </Text>
                ))}
                {meal.prepInstructions && <Text style={styles.prepText}>{meal.prepInstructions}</Text>}
              </View>
            ))}
            <View style={styles.dayTotalsRow}>
              <View>
                <Text style={styles.totalLabel}>Calories</Text>
                <Text style={styles.totalValue}>{day.totals.calories}</Text>
              </View>
              <View>
                <Text style={styles.totalLabel}>Protein</Text>
                <Text style={styles.totalValue}>{day.totals.proteinG}g</Text>
              </View>
              <View>
                <Text style={styles.totalLabel}>Carbs</Text>
                <Text style={styles.totalValue}>{day.totals.carbsG}g</Text>
              </View>
              <View>
                <Text style={styles.totalLabel}>Fat</Text>
                <Text style={styles.totalValue}>{day.totals.fatG}g</Text>
              </View>
              <View>
                <Text style={styles.totalLabel}>Fiber</Text>
                <Text style={styles.totalValue}>{day.totals.fiberG}g</Text>
              </View>
              <View>
                <Text style={styles.totalLabel}>Sodium</Text>
                <Text style={styles.totalValue}>{day.totals.sodiumMg}mg</Text>
              </View>
            </View>
          </View>
        ))}

        {groceryGroups.length > 0 && (
          <View break>
            <Text style={styles.sectionTitle}>Grocery List</Text>
            {groceryGroups.map((group) => (
              <View key={group.category}>
                <Text style={styles.groceryCategory}>{CATEGORY_LABELS[group.category]}</Text>
                {group.items.map((item, idx) => (
                  <Text key={idx} style={styles.groceryItem}>
                    ☐ {item.name}
                    {item.quantity ? ` — ${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : ""}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        <Text style={styles.disclaimer}>{branding.legal.footer}</Text>
        <Text style={styles.disclaimer}>{branding.legal.clinicalDisclaimer}</Text>

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `${branding.appName} · Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
