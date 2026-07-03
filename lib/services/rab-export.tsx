import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import ExcelJS from "exceljs";
import {
  AlignmentType,
  Document as DocxDocument,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import {
  categoryTotal,
  formatQuantity,
  formatRupiah,
  grandTotal,
  itemSubtotal,
} from "@/lib/services/rab.service";

export type ExportItem = {
  name: string;
  volume: string | number;
  unit: string;
  unitPrice: string | number;
  notes: string | null;
};

export type ExportCategory = {
  name: string;
  items: ExportItem[];
};

export type ExportRab = {
  title: string;
  description: string | null;
  createdByName: string;
  createdAt: Date;
  categories: ExportCategory[];
};

// ========================
// PDF
// ========================

const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#111" },
  h1: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  meta: { fontSize: 9, color: "#555", marginBottom: 12 },
  desc: { marginBottom: 12, fontStyle: "italic" },
  categoryTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "#f0f0f0",
    padding: 4,
  },
  table: { borderWidth: 1, borderColor: "#000" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#000" },
  header: { backgroundColor: "#e7e7e7", fontFamily: "Helvetica-Bold" },
  cell: { padding: 4, borderRightWidth: 0.5, borderColor: "#000" },
  cellNo: { width: 26, textAlign: "center" },
  cellName: { flex: 3 },
  cellVol: { width: 60, textAlign: "right" },
  cellUnit: { width: 55 },
  cellPrice: { width: 90, textAlign: "right" },
  cellSub: { width: 100, textAlign: "right", borderRightWidth: 0 },
  subtotalRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderColor: "#000",
    backgroundColor: "#fafafa",
  },
  subtotalLabel: { flex: 1, padding: 4, textAlign: "right", fontFamily: "Helvetica-Bold" },
  subtotalValue: {
    width: 100,
    padding: 4,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
  },
  grandRow: {
    flexDirection: "row",
    marginTop: 16,
    padding: 6,
    backgroundColor: "#000",
    color: "#fff",
  },
  grandLabel: { flex: 1, fontFamily: "Helvetica-Bold" },
  grandValue: { fontFamily: "Helvetica-Bold" },
});

function RabPdf({ rab }: { rab: ExportRab }) {
  const total = grandTotal(rab.categories);
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.h1}>RENCANA ANGGARAN BIAYA (RAB)</Text>
        <Text style={pdfStyles.h1}>{rab.title}</Text>
        <Text style={pdfStyles.meta}>
          Disusun oleh: {rab.createdByName} · Tanggal:{" "}
          {rab.createdAt.toLocaleDateString("id-ID", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>
        {rab.description && <Text style={pdfStyles.desc}>{rab.description}</Text>}

        {rab.categories.map((cat, ci) => {
          const catSubtotal = categoryTotal(cat.items);
          return (
            <View key={ci} wrap={false} style={{ marginBottom: 8 }}>
              <Text style={pdfStyles.categoryTitle}>
                {String.fromCharCode(65 + ci)}. {cat.name}
              </Text>
              <View style={pdfStyles.table}>
                <View style={[pdfStyles.row, pdfStyles.header]}>
                  <Text style={[pdfStyles.cell, pdfStyles.cellNo]}>No</Text>
                  <Text style={[pdfStyles.cell, pdfStyles.cellName]}>Uraian</Text>
                  <Text style={[pdfStyles.cell, pdfStyles.cellVol]}>Volume</Text>
                  <Text style={[pdfStyles.cell, pdfStyles.cellUnit]}>Satuan</Text>
                  <Text style={[pdfStyles.cell, pdfStyles.cellPrice]}>Harga Satuan</Text>
                  <Text style={[pdfStyles.cell, pdfStyles.cellSub]}>Subtotal</Text>
                </View>
                {cat.items.length === 0 && (
                  <View style={pdfStyles.row}>
                    <Text
                      style={[
                        pdfStyles.cell,
                        { flex: 1, textAlign: "center", fontStyle: "italic" },
                      ]}
                    >
                      (Kategori kosong)
                    </Text>
                  </View>
                )}
                {cat.items.map((it, ii) => (
                  <View key={ii} style={pdfStyles.row}>
                    <Text style={[pdfStyles.cell, pdfStyles.cellNo]}>{ii + 1}</Text>
                    <Text style={[pdfStyles.cell, pdfStyles.cellName]}>{it.name}</Text>
                    <Text style={[pdfStyles.cell, pdfStyles.cellVol]}>
                      {formatQuantity(it.volume)}
                    </Text>
                    <Text style={[pdfStyles.cell, pdfStyles.cellUnit]}>{it.unit}</Text>
                    <Text style={[pdfStyles.cell, pdfStyles.cellPrice]}>
                      {formatRupiah(Number(it.unitPrice))}
                    </Text>
                    <Text style={[pdfStyles.cell, pdfStyles.cellSub]}>
                      {formatRupiah(itemSubtotal(it))}
                    </Text>
                  </View>
                ))}
                <View style={pdfStyles.subtotalRow}>
                  <Text style={pdfStyles.subtotalLabel}>Subtotal {cat.name}</Text>
                  <Text style={pdfStyles.subtotalValue}>{formatRupiah(catSubtotal)}</Text>
                </View>
              </View>
            </View>
          );
        })}

        <View style={pdfStyles.grandRow}>
          <Text style={pdfStyles.grandLabel}>GRAND TOTAL</Text>
          <Text style={pdfStyles.grandValue}>{formatRupiah(total)}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderRabPdf(rab: ExportRab): Promise<Buffer> {
  return renderToBuffer(<RabPdf rab={rab} />);
}

// ========================
// XLSX
// ========================

export async function renderRabXlsx(rab: ExportRab): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Coordex";
  wb.created = new Date();
  const ws = wb.addWorksheet("RAB");

  ws.columns = [
    { width: 6 },
    { width: 40 },
    { width: 12 },
    { width: 10 },
    { width: 18 },
    { width: 20 },
  ];

  ws.mergeCells("A1:F1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "RENCANA ANGGARAN BIAYA (RAB)";
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: "center" };

  ws.mergeCells("A2:F2");
  const subCell = ws.getCell("A2");
  subCell.value = rab.title;
  subCell.font = { bold: true, size: 12 };
  subCell.alignment = { horizontal: "center" };

  ws.getCell("A4").value = `Disusun oleh: ${rab.createdByName}`;
  ws.getCell("A5").value = `Tanggal: ${rab.createdAt.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`;
  if (rab.description) {
    ws.mergeCells("A6:F6");
    ws.getCell("A6").value = rab.description;
    ws.getCell("A6").font = { italic: true };
  }

  let row = 8;
  const headerRow = ws.getRow(row);
  headerRow.values = ["No", "Uraian", "Volume", "Satuan", "Harga Satuan", "Subtotal"];
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
  row++;

  rab.categories.forEach((cat, ci) => {
    ws.mergeCells(row, 1, row, 6);
    const catCell = ws.getCell(row, 1);
    catCell.value = `${String.fromCharCode(65 + ci)}. ${cat.name}`;
    catCell.font = { bold: true };
    catCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };
    row++;

    cat.items.forEach((it, ii) => {
      const r = ws.getRow(row);
      const sub = itemSubtotal(it);
      r.values = [
        ii + 1,
        it.name,
        Number(it.volume),
        it.unit,
        Number(it.unitPrice),
        sub,
      ];
      r.getCell(3).numFmt = "#,##0.##";
      r.getCell(5).numFmt = `"Rp" #,##0`;
      r.getCell(6).numFmt = `"Rp" #,##0`;
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

    const subRow = ws.getRow(row);
    subRow.getCell(2).value = `Subtotal ${cat.name}`;
    subRow.getCell(2).font = { bold: true };
    subRow.getCell(2).alignment = { horizontal: "right" };
    subRow.getCell(6).value = categoryTotal(cat.items);
    subRow.getCell(6).numFmt = `"Rp" #,##0`;
    subRow.getCell(6).font = { bold: true };
    subRow.eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } };
    });
    row++;
  });

  row++;
  const grandRow = ws.getRow(row);
  grandRow.getCell(2).value = "GRAND TOTAL";
  grandRow.getCell(2).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  grandRow.getCell(2).alignment = { horizontal: "right" };
  grandRow.getCell(6).value = grandTotal(rab.categories);
  grandRow.getCell(6).numFmt = `"Rp" #,##0`;
  grandRow.getCell(6).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  [2, 3, 4, 5, 6].forEach((c) => {
    grandRow.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF111111" },
    };
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ========================
// DOCX
// ========================

function cell(text: string, opts: { bold?: boolean; align?: "left" | "right" | "center" } = {}) {
  return new TableCell({
    children: [
      new Paragraph({
        alignment:
          opts.align === "right"
            ? AlignmentType.RIGHT
            : opts.align === "center"
              ? AlignmentType.CENTER
              : AlignmentType.LEFT,
        children: [new TextRun({ text, bold: opts.bold })],
      }),
    ],
  });
}

export async function renderRabDocx(rab: ExportRab): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: "RENCANA ANGGARAN BIAYA (RAB)",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: rab.title, bold: true, size: 26 })],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Disusun oleh: ${rab.createdByName}`, size: 20 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Tanggal: ${rab.createdAt.toLocaleDateString("id-ID", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}`,
          size: 20,
        }),
      ],
    }),
  ];

  if (rab.description) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: rab.description, italics: true, size: 20 })],
      }),
    );
  }

  rab.categories.forEach((cat, ci) => {
    children.push(new Paragraph({ text: "" }));
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: `${String.fromCharCode(65 + ci)}. ${cat.name}`,
            bold: true,
          }),
        ],
      }),
    );

    const rows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          cell("No", { bold: true, align: "center" }),
          cell("Uraian", { bold: true }),
          cell("Volume", { bold: true, align: "right" }),
          cell("Satuan", { bold: true }),
          cell("Harga Satuan", { bold: true, align: "right" }),
          cell("Subtotal", { bold: true, align: "right" }),
        ],
      }),
    ];

    cat.items.forEach((it, ii) => {
      rows.push(
        new TableRow({
          children: [
            cell(String(ii + 1), { align: "center" }),
            cell(it.name),
            cell(formatQuantity(it.volume), { align: "right" }),
            cell(it.unit),
            cell(formatRupiah(Number(it.unitPrice)), { align: "right" }),
            cell(formatRupiah(itemSubtotal(it)), { align: "right" }),
          ],
        }),
      );
    });

    rows.push(
      new TableRow({
        children: [
          cell("", {}),
          cell("", {}),
          cell("", {}),
          cell("", {}),
          cell(`Subtotal`, { bold: true, align: "right" }),
          cell(formatRupiah(categoryTotal(cat.items)), { bold: true, align: "right" }),
        ],
      }),
    );

    children.push(
      new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
    );
  });

  children.push(new Paragraph({ text: "" }));
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: `GRAND TOTAL: ${formatRupiah(grandTotal(rab.categories))}`,
          bold: true,
          size: 28,
        }),
      ],
    }),
  );

  const doc = new DocxDocument({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
