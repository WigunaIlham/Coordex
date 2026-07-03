import { Text, View } from "@react-pdf/renderer";

import { DOCUMENT_HEADER } from "@/lib/constants";
import { styles } from "./styles";

/**
 * Formal document letterhead — 3-line institutional block terpusat, dengan
 * garis pemisah tebal + tipis (khas kop surat resmi Indonesia).
 */
export function SuratHeader({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.kopBlock} fixed>
      <Text style={styles.kopUniversity}>{DOCUMENT_HEADER.university}</Text>
      <Text style={styles.kopProgram}>{DOCUMENT_HEADER.program}</Text>
      <Text style={styles.kopSubtitle}>
        {DOCUMENT_HEADER.location} · {DOCUMENT_HEADER.email}
      </Text>
      <View style={styles.kopDividerThick} />
      <View style={styles.kopDividerThin} />
      {subtitle && (
        <Text style={styles.docSubtitle}>{subtitle.toUpperCase()}</Text>
      )}
    </View>
  );
}

/**
 * Standard signature block: "kota, tanggal" line kanan-atas, jabatan,
 * blank space untuk TTD basah, nama tebal + NIM.
 */
export function SignatureBlock({
  city,
  date,
  role,
  name,
  nim,
  secondaryRole,
  secondaryName,
  secondaryNim,
}: {
  city?: string;
  date: string;
  role: string;
  name: string;
  nim?: string;
  secondaryRole?: string;
  secondaryName?: string;
  secondaryNim?: string;
}) {
  const showSecondary = !!(secondaryRole && secondaryName);
  return (
    <View style={styles.signatureContainer}>
      {city && (
        <Text style={styles.signatureCity}>
          {city}, {date}
        </Text>
      )}
      <View style={styles.signatureRow}>
        {showSecondary && (
          <View style={styles.signatureBlock}>
            <Text>{secondaryRole}</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.signatureName}>{secondaryName}</Text>
            {secondaryNim && (
              <Text style={styles.signatureNim}>NIM. {secondaryNim}</Text>
            )}
          </View>
        )}
        <View style={styles.signatureBlock}>
          <Text>{role}</Text>
          <View style={styles.signatureSpace} />
          <Text style={styles.signatureName}>{name}</Text>
          {nim && <Text style={styles.signatureNim}>NIM. {nim}</Text>}
        </View>
      </View>
    </View>
  );
}
