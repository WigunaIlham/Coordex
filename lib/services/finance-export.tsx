import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import ExcelJS from "exceljs";

import { formatRupiah } from "@/lib/services/rab.service";

export type FinanceTx = {
  date: Date;
  type: "PEMASUKAN" | "PENGELUARAN";
  category: string;
  description: string;
  amount: number;
  recordedByName: string;
};

export type FinanceExport = {
  title: string;
  generatedAt: Date;
  summary: { pemasukan: number; pengeluaran: number; saldo: number };
  transactions: FinanceTx[];
};

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: "Helvetica", fontSize: 9, color: "#111" },
  h1: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 9, color: "#555", marginBottom: 10 },
  summary: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 10,
  },
  summaryCell: {
    flex: 1,
    padding: 6,
    borderRightWidth: 0.5,
    borderColor: "#000",
  },
  summaryLabel: { fontSize: 8, color: "#666" },
  summaryValue: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  table: { borderWidth: 1, borderColor: "#000" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#000" },
  header: { backgroundColor: "#e7e7e7", fontFamily: "Helvetica-Bold" },
  cell: { padding: 3, borderRightWidth: 0.5, borderColor: "#000" },
  cellDate: { width: 60 },
  cellType: { width: 55 },
  cellCat: { width: 80 },
  cellDesc: { flex: 1 },
  cellRec: { width: 70 },
  cellAmount: { width: 80, textAlign: "right", borderRightWidth: 0 },
});

function FinancePdf({ data }: { data: FinanceExport }) {
  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        <Text style={styles.h1}>{data.title}</Text>
        <Text style={styles.meta}>
          Digenerate {data.generatedAt.toLocaleString("id-ID")}
        </Text>

        <View style={styles.summary}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Total Pemasukan</Text>
            <Text style={[styles.summaryValue, { color: "#059669" }]}>
              {formatRupiah(data.summary.pemasukan)}
            </Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Total Pengeluaran</Text>
            <Text style={[styles.summaryValue, { color: "#dc2626" }]}>
              {formatRupiah(data.summary.pengeluaran)}
            </Text>
          </View>
          <View style={[styles.summaryCell, { borderRightWidth: 0 }]}>
            <Text style={styles.summaryLabel}>Saldo</Text>
            <Text style={styles.summaryValue}>{formatRupiah(data.summary.saldo)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.header]}>
            <Text style={[styles.cell, styles.cellDate]}>Tanggal</Text>
            <Text style={[styles.cell, styles.cellType]}>Tipe</Text>
            <Text style={[styles.cell, styles.cellCat]}>Kategori</Text>
            <Text style={[styles.cell, styles.cellDesc]}>Deskripsi</Text>
            <Text style={[styles.cell, styles.cellRec]}>Pencatat</Text>
            <Text style={[styles.cell, styles.cellAmount]}>Nominal</Text>
          </View>
          {data.transactions.map((t, i) => (
            <View key={i} style={styles.row}>
              <Text style={[styles.cell, styles.cellDate]}>
                {t.date.toLocaleDateString("id-ID")}
              </Text>
              <Text style={[styles.cell, styles.cellType]}>
                {t.type === "PEMASUKAN" ? "Masuk" : "Keluar"}
              </Text>
              <Text style={[styles.cell, styles.cellCat]}>{t.category}</Text>
              <Text style={[styles.cell, styles.cellDesc]}>{t.description}</Text>
              <Text style={[styles.cell, styles.cellRec]}>{t.recordedByName}</Text>
              <Text
                style={[
                  styles.cell,
                  styles.cellAmount,
                  { color: t.type === "PEMASUKAN" ? "#059669" : "#dc2626" },
                ]}
              >
                {t.type === "PEMASUKAN" ? "+" : "-"}
                {formatRupiah(t.amount)}
              </Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export async function renderFinancePdf(data: FinanceExport): Promise<Buffer> {
  return renderToBuffer(<FinancePdf data={data} />);
}

export async function renderFinanceXlsx(data: FinanceExport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Coordex";
  wb.created = new Date();
  const ws = wb.addWorksheet("Keuangan");

  ws.columns = [
    { width: 12 }, // Tanggal
    { width: 12 }, // Tipe
    { width: 20 }, // Kategori
    { width: 40 }, // Deskripsi
    { width: 18 }, // Pencatat
    { width: 18 }, // Nominal
  ];

  ws.mergeCells("A1:F1");
  const title = ws.getCell("A1");
  title.value = data.title;
  title.font = { bold: true, size: 14 };
  title.alignment = { horizontal: "center" };

  ws.getCell("A3").value = "Total Pemasukan";
  ws.getCell("A3").font = { bold: true };
  ws.getCell("B3").value = data.summary.pemasukan;
  ws.getCell("B3").numFmt = `"Rp" #,##0`;
  ws.getCell("A4").value = "Total Pengeluaran";
  ws.getCell("A4").font = { bold: true };
  ws.getCell("B4").value = data.summary.pengeluaran;
  ws.getCell("B4").numFmt = `"Rp" #,##0`;
  ws.getCell("A5").value = "Saldo";
  ws.getCell("A5").font = { bold: true };
  ws.getCell("B5").value = data.summary.saldo;
  ws.getCell("B5").numFmt = `"Rp" #,##0`;

  const headerRow = ws.getRow(7);
  headerRow.values = ["Tanggal", "Tipe", "Kategori", "Deskripsi", "Pencatat", "Nominal"];
  headerRow.font = { bold: true };
  headerRow.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7E7E7" } };
    c.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
    c.alignment = { horizontal: "center" };
  });

  let row = 8;
  data.transactions.forEach((t) => {
    const r = ws.getRow(row);
    r.values = [
      t.date,
      t.type === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran",
      t.category,
      t.description,
      t.recordedByName,
      t.type === "PEMASUKAN" ? t.amount : -t.amount,
    ];
    r.getCell(1).numFmt = "yyyy-mm-dd";
    r.getCell(6).numFmt = `"Rp" #,##0;[Red]"Rp" -#,##0`;
    r.eachCell((c) => {
      c.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
    row++;
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
