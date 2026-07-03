import { Document, Page, Text, View } from "@react-pdf/renderer";

import { DOCUMENT_HEADER } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { SignatureBlock, SuratHeader } from "./header";
import { styles } from "./styles";

type Data = {
  judulRapat: string;
  tanggal: string;
  waktuMulai?: string;
  waktuSelesai?: string;
  tempat: string;
  pemimpinRapat: string;
  notulis: string;
  pesertaTidakHadir?: string;
  agenda: string;
  pembahasan: string;
  hasilRapat: string;
  tindakLanjut?: string;
};

export function NotulenRapatPDF({
  data,
  attendees,
}: {
  data: Data;
  attendees: { name: string; nim?: string }[];
}) {
  const timeRange =
    data.waktuMulai && data.waktuSelesai
      ? `${data.waktuMulai} – ${data.waktuSelesai} WIB`
      : data.waktuMulai || "—";

  // Section letter sequence: A. Peserta, [B. Tidak Hadir?], C./B. Agenda, ...
  const hasAbsent = !!(data.pesertaTidakHadir && data.pesertaTidakHadir.trim());
  const letter = (base: number) => String.fromCharCode(65 + base + (hasAbsent ? 0 : -1) + 1);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <SuratHeader subtitle="Notulen Rapat" />

        {/* Judul rapat */}
        <Text
          style={{
            ...styles.bold,
            fontSize: 12,
            textAlign: "center",
            marginTop: 4,
            marginBottom: 12,
          }}
        >
          {data.judulRapat}
        </Text>

        {/* Meta rapat */}
        <View style={styles.section}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Hari, Tanggal</Text>
            <Text style={styles.fieldValue}>
              : {formatDate(data.tanggal, { dateStyle: "full" })}
            </Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Waktu</Text>
            <Text style={styles.fieldValue}>: {timeRange}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Tempat</Text>
            <Text style={styles.fieldValue}>: {data.tempat}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Pemimpin Rapat</Text>
            <Text style={styles.fieldValue}>: {data.pemimpinRapat}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Notulis</Text>
            <Text style={styles.fieldValue}>: {data.notulis}</Text>
          </View>
        </View>

        {/* A. Peserta Hadir — numbered list */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>A. Peserta Hadir</Text>
          {attendees.length === 0 ? (
            <Text style={{ marginLeft: 12, ...styles.italic }}>
              (Belum ada peserta terdaftar)
            </Text>
          ) : (
            attendees.map((a, i) => (
              <View
                key={i}
                style={{ flexDirection: "row", marginLeft: 12, marginBottom: 1 }}
              >
                <Text style={{ width: 20 }}>{i + 1}.</Text>
                <Text style={{ flex: 1 }}>
                  {a.name}
                  {a.nim ? ` — NIM ${a.nim}` : ""}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* B. Peserta Tidak Hadir (opsional) */}
        {hasAbsent && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>B. Peserta Tidak Hadir</Text>
            <Text style={{ marginLeft: 12 }}>{data.pesertaTidakHadir}</Text>
          </View>
        )}

        {/* C. Agenda */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>{letter(1)}. Agenda Rapat</Text>
          <Text style={{ marginLeft: 12 }}>{data.agenda}</Text>
        </View>

        {/* D. Pembahasan */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>{letter(2)}. Pembahasan</Text>
          <Text style={{ ...styles.paragraphNoIndent, marginLeft: 12 }}>
            {data.pembahasan}
          </Text>
        </View>

        {/* E. Keputusan */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>
            {letter(3)}. Keputusan / Kesimpulan
          </Text>
          <Text style={{ marginLeft: 12 }}>{data.hasilRapat}</Text>
        </View>

        {/* F. Tindak Lanjut (opsional) */}
        {data.tindakLanjut && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>
              {letter(4)}. Tindak Lanjut
            </Text>
            <Text style={{ marginLeft: 12 }}>{data.tindakLanjut}</Text>
          </View>
        )}

        {/* Signature */}
        <SignatureBlock
          city={DOCUMENT_HEADER.city}
          date={formatDate(data.tanggal, { dateStyle: "long" })}
          role="Mengetahui, Pemimpin Rapat"
          name={data.pemimpinRapat}
          secondaryRole="Notulis,"
          secondaryName={data.notulis}
        />
      </Page>
    </Document>
  );
}
