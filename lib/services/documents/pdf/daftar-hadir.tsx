import { Document, Page, Text, View } from "@react-pdf/renderer";

import { DOCUMENT_HEADER } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { SuratHeader } from "./header";
import { styles } from "./styles";

type Attendee = { name: string; nim?: string };

type Data = {
  namaKegiatan: string;
  tanggal: string;
  waktu?: string;
  tempat: string;
  penyelenggara?: string;
  attendees: Attendee[];
};

export function DaftarHadirPDF({ data }: { data: Data }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <SuratHeader subtitle="Daftar Hadir" />

        {/* Judul kegiatan */}
        <Text
          style={{
            ...styles.bold,
            fontSize: 12,
            textAlign: "center",
            marginTop: 4,
            marginBottom: 2,
          }}
        >
          {data.namaKegiatan}
        </Text>

        {/* Meta kegiatan */}
        <View style={{ marginBottom: 10, alignItems: "center" }}>
          <Text style={{ fontSize: 10 }}>
            {formatDate(data.tanggal, { dateStyle: "full" })}
            {data.waktu ? ` · ${data.waktu}` : ""}
          </Text>
          <Text style={{ fontSize: 10, marginTop: 1 }}>
            Tempat: {data.tempat}
          </Text>
          {data.penyelenggara && (
            <Text style={{ fontSize: 10, marginTop: 1 }}>
              Penyelenggara: {data.penyelenggara}
            </Text>
          )}
        </View>

        <View style={styles.table}>
          {/* Header row */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.tableCell, { width: 32, textAlign: "center" }]}>
              <Text>No</Text>
            </View>
            <View style={[styles.tableCell, { flex: 2.5 }]}>
              <Text>Nama Lengkap</Text>
            </View>
            <View style={[styles.tableCell, { flex: 1.3 }]}>
              <Text>NIM</Text>
            </View>
            <View style={[styles.tableCell, { flex: 1.5, borderRightWidth: 0 }]}>
              <Text>Tanda Tangan</Text>
            </View>
          </View>
          {/* Body rows */}
          {data.attendees.map((a, idx) => (
            <View key={idx} style={styles.tableRow}>
              <View
                style={[
                  styles.tableCell,
                  { width: 32, textAlign: "center", height: 28 },
                ]}
              >
                <Text>{idx + 1}</Text>
              </View>
              <View style={[styles.tableCell, { flex: 2.5, height: 28 }]}>
                <Text>{a.name}</Text>
              </View>
              <View style={[styles.tableCell, { flex: 1.3, height: 28 }]}>
                <Text>{a.nim ?? ""}</Text>
              </View>
              <View
                style={[
                  styles.tableCell,
                  { flex: 1.5, borderRightWidth: 0, height: 28 },
                ]}
              >
                {/* Blank cell for wet signature */}
                <Text> </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Signature line */}
        <View style={{ marginTop: 24, alignItems: "flex-end" }}>
          <Text>
            {DOCUMENT_HEADER.city}, {formatDate(data.tanggal, { dateStyle: "long" })}
          </Text>
          <Text style={{ marginTop: 2 }}>Mengetahui,</Text>
          <View style={{ height: 48 }} />
          <Text style={styles.bold}>Ketua Pelaksana</Text>
        </View>
      </Page>
    </Document>
  );
}
