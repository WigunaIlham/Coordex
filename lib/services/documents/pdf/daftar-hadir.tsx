import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { DOCUMENT_HEADER } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { SuratHeader } from "./header";
import { styles as base } from "./styles";

type Attendee = { name: string; nim?: string; signature?: string | null };

type Data = {
  namaKegiatan: string;
  tanggal: string;
  waktu?: string;
  tempat: string;
  penyelenggara?: string;
  penyelenggaraLabel?: string;
  attendees: Attendee[];
};

// Style khusus daftar hadir — dipisah supaya bisa dituning agresif (kompak,
// muat 1 halaman A4) tanpa ganggu template lain.
const dh = StyleSheet.create({
  page: {
    ...base.page,
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 48,
    fontSize: 10,
    lineHeight: 1.25,
  },
  activityTitle: {
    fontFamily: "Times-Bold",
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaBlock: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  metaLine: {
    fontSize: 10,
    marginTop: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: "#000",
    marginTop: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderColor: "#000",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#e5e5e5",
  },
  cellNo: {
    width: 28,
    borderRightWidth: 0.5,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  cellName: {
    flex: 3,
    borderRightWidth: 0.5,
    borderColor: "#000",
    justifyContent: "center",
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  cellNim: {
    width: 78,
    borderRightWidth: 0.5,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  cellTtd: {
    width: 110,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 3,
  },
  cellText: {
    fontSize: 9.5,
  },
  headerText: {
    fontFamily: "Times-Bold",
    fontSize: 10,
  },
  rowHeight: {
    minHeight: 24,
  },
  ttdImage: {
    maxHeight: 20,
    maxWidth: 100,
    objectFit: "contain",
  },
  footer: {
    marginTop: 14,
    alignItems: "flex-end",
  },
  footerCity: {
    fontSize: 10,
  },
  footerRole: {
    fontSize: 10,
    marginTop: 2,
  },
  footerName: {
    fontFamily: "Times-Bold",
    fontSize: 10,
    textDecoration: "underline",
    marginTop: 44,
  },
});

export function DaftarHadirPDF({ data }: { data: Data }) {
  const penyelenggaraLabel =
    data.penyelenggaraLabel?.trim() || "Penyelenggara";

  return (
    <Document>
      <Page size="A4" style={dh.page}>
        <SuratHeader subtitle="Daftar Hadir" />

        <Text style={dh.activityTitle}>{data.namaKegiatan}</Text>

        <View style={dh.metaBlock}>
          <Text style={dh.metaLine}>
            {formatDate(data.tanggal, { dateStyle: "full" })}
            {data.waktu ? ` · ${data.waktu}` : ""}
          </Text>
          <Text style={dh.metaLine}>Tempat: {data.tempat}</Text>
          {data.penyelenggara && (
            <Text style={dh.metaLine}>
              {penyelenggaraLabel}: {data.penyelenggara}
            </Text>
          )}
        </View>

        <View style={dh.table}>
          <View style={dh.tableHeaderRow} fixed>
            <View style={dh.cellNo}>
              <Text style={dh.headerText}>No</Text>
            </View>
            <View style={dh.cellName}>
              <Text style={dh.headerText}>Nama Lengkap</Text>
            </View>
            <View style={dh.cellNim}>
              <Text style={dh.headerText}>NIM</Text>
            </View>
            <View style={dh.cellTtd}>
              <Text style={dh.headerText}>Tanda Tangan</Text>
            </View>
          </View>

          {data.attendees.map((a, idx) => (
            <View
              key={idx}
              style={[dh.tableRow, dh.rowHeight]}
              wrap={false}
            >
              <View style={dh.cellNo}>
                <Text style={dh.cellText}>{idx + 1}</Text>
              </View>
              <View style={dh.cellName}>
                <Text style={dh.cellText}>{a.name}</Text>
              </View>
              <View style={dh.cellNim}>
                <Text style={dh.cellText}>{a.nim ?? ""}</Text>
              </View>
              <View style={dh.cellTtd}>
                {a.signature ? (
                  <Image src={a.signature} style={dh.ttdImage} />
                ) : (
                  <Text style={dh.cellText}> </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={dh.footer} wrap={false}>
          <Text style={dh.footerCity}>
            {DOCUMENT_HEADER.city},{" "}
            {formatDate(data.tanggal, { dateStyle: "long" })}
          </Text>
          <Text style={dh.footerRole}>Ketua Pelaksana</Text>
          <Text style={dh.footerName}>(______________________)</Text>
        </View>
      </Page>
    </Document>
  );
}
