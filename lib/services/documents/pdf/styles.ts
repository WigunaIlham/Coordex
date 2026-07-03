import { StyleSheet } from "@react-pdf/renderer";

/**
 * Style tokens tuned for Indonesian formal document conventions:
 * - Times-Roman body (typewriter-ish, mimic surat resmi)
 * - 12pt kop, 11pt body, 10pt meta
 * - Justified paragraph body
 * - Clear signature block spacing (~48pt gap for wet signature)
 */
export const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 56,
    fontFamily: "Times-Roman",
    fontSize: 11,
    color: "#0a0a0a",
    lineHeight: 1.35,
  },

  // ─── Letterhead ──────────────────────────────────────────
  kopBlock: {
    textAlign: "center",
    marginBottom: 14,
  },
  kopUniversity: {
    fontSize: 14,
    fontFamily: "Times-Bold",
    letterSpacing: 0.5,
  },
  kopProgram: {
    fontSize: 12,
    fontFamily: "Times-Bold",
    marginTop: 2,
  },
  kopSubtitle: {
    fontSize: 9,
    marginTop: 2,
    color: "#333",
  },
  kopDividerThick: {
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    marginTop: 6,
  },
  kopDividerThin: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
    marginTop: 1.5,
    marginBottom: 6,
  },
  docSubtitle: {
    fontSize: 11,
    fontFamily: "Times-Bold",
    marginTop: 10,
    textAlign: "center",
    textDecoration: "underline",
  },

  // ─── Common blocks ───────────────────────────────────────
  section: {
    marginBottom: 10,
  },
  sectionHeading: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  paragraph: {
    textAlign: "justify",
    marginBottom: 6,
    textIndent: 24,
  },
  paragraphNoIndent: {
    textAlign: "justify",
    marginBottom: 6,
  },

  // ─── Field-label rows (Nomor: xxx style) ─────────────────
  fieldRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  fieldLabel: {
    width: 110,
  },
  fieldValue: {
    flex: 1,
  },

  // ─── Legacy support ──────────────────────────────────────
  title: {
    fontSize: 14,
    fontFamily: "Times-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 10,
    marginTop: 2,
  },
  divider: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#000",
    marginVertical: 8,
  },
  thinDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#999",
    marginVertical: 6,
  },
  headerBlock: {
    textAlign: "center",
    marginBottom: 16,
  },
  bold: {
    fontFamily: "Times-Bold",
  },
  italic: {
    fontFamily: "Times-Italic",
  },

  // ─── Meta table (event details) ──────────────────────────
  metaTable: {
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 24,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  metaKey: {
    width: 90,
  },
  metaSep: {
    width: 10,
  },
  metaValue: {
    flex: 1,
  },

  // ─── Signature block ─────────────────────────────────────
  signatureContainer: {
    marginTop: 30,
  },
  signatureCity: {
    textAlign: "right",
    marginBottom: 10,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 30,
  },
  signatureBlock: {
    flex: 1,
    alignItems: "center",
  },
  signatureSpace: {
    height: 48,
  },
  signatureName: {
    fontFamily: "Times-Bold",
    textDecoration: "underline",
  },
  signatureNim: {
    fontSize: 10,
    marginTop: 1,
  },

  // ─── Data table ──────────────────────────────────────────
  table: {
    borderWidth: 1,
    borderColor: "#000",
    marginTop: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: "#000",
  },
  tableHeader: {
    fontFamily: "Times-Bold",
    backgroundColor: "#e5e5e5",
  },
  tableCell: {
    padding: 5,
    borderRightWidth: 0.5,
    borderColor: "#000",
  },
});
