class ExcelExporter {
  constructor() {
    this.templateUrl = 'Aprūpes lapas.xlsx';
  }

  async loadTemplateBuffer() {
    const response = await fetch(this.templateUrl);
    if (!response.ok) {
      throw new Error('Neizdevās ielādēt MK veidni');
    }
    return await response.arrayBuffer();
  }

  async generateMonth(client, year, month, marks, signers) {
    if (typeof XLSX === 'undefined') {
      throw new Error('XLSX bibliotēka nav ielādēta');
    }

    const buffer = await this.loadTemplateBuffer();
    const wb = XLSX.read(buffer, { type: 'array', cellStyles: true });

    const daysInMonth = new Date(year, month, 0).getDate();

    const dataByDay = {};
    marks.forEach(m => {
      const d = new Date(m.date);
      if (d.getFullYear() === year && (d.getMonth() + 1) === month) {
        const day = d.getDate();
        if (!dataByDay[day]) dataByDay[day] = {};
        dataByDay[day][m.shift + '|' + m.category + '|' + m.field] = m.value;
      }
    });

    if (wb.SheetNames.includes('APRŪPES DOKUMANTĀCIJA_1')) {
      this.fillSheet(wb.Sheets['APRŪPES DOKUMANTĀCIJA_1'], dataByDay, 1, 15);
    }
    if (wb.SheetNames.includes('APRŪPES DOKUMANTĀCIJA_2')) {
      this.fillSheet(wb.Sheets['APRŪPES DOKUMANTĀCIJA_2'], dataByDay, 16, daysInMonth);
    }

    const fullName = (client.vards || client.Vārds || '') + ' ' + (client.uzvards || client.Uzvārds || '');
    const monthName = new Date(year, month - 1, 1).toLocaleString('lv-LV', { month: 'long' });
    const filename = `${fullName}_${year}_${String(month).padStart(2, '0')}.xlsx`;

    XLSX.writeFile(wb, filename, { bookType: 'xlsx' });
    return filename;
  }

  fillSheet(ws, dataByDay, startDay, endDay) {
    const sheet1Offset = startDay === 1;

    const FIELD_ROWS = sheet1Offset
      ? { 9: 9, 10: 10, 11: 11, 12: 12, 13: 13, 14: 14, 15: 15, 16: 16, 17: 17, 18: 18, 19: 19, 20: 20, 21: 21, 22: 22, 23: 23, 24: 24, 25: 25, 26: 26, 27: 27, 28: 28, 29: 29, 30: 30, 31: 31 }
      : { 9: 4, 10: 5, 11: 6, 12: 7, 13: 8, 14: 9, 15: 10, 16: 11, 17: 12, 18: 13, 19: 14, 20: 15, 21: 16, 22: 17, 23: 18, 24: 19, 25: 20, 26: 21, 27: 22, 28: 23, 29: 24, 30: 25, 31: 26 };

    for (let day = startDay; day <= endDay; day++) {
      const dayData = dataByDay[day] || {};
      const dayOffset = day - startDay;
      const colR = 2 + dayOffset * 2;
      const colV = colR + 1;

      const setValue = (rowNum, col, value) => {
        if (!value || value === '') return;
        const addr = XLSX.utils.encode_cell({ r: rowNum - 1, c: col });
        if (!ws[addr]) {
          ws[addr] = { t: 's', v: value };
        } else {
          ws[addr].v = value;
        }
      };

      for (let r = 9; r <= 31; r++) {
        const map = this.getFieldMap(r);
        if (!map) continue;
        const { category, field } = map;

        const targetRow = FIELD_ROWS[r];
        const valR = dayData['R|' + category + '|' + field];
        const valV = dayData['V|' + category + '|' + field];

        if (valR !== undefined && valR !== '') {
          setValue(targetRow, colR, valR);
        }
        if (valV !== undefined && valV !== '') {
          setValue(targetRow, colV, valV);
        }
      }
    }
  }

  getFieldMap(row) {
    const map = {
      9: { category: 'temp', field: 'temperatura' },
      10: { category: 'higiena', field: 'mutes_dobuma_kopsana' },
      11: { category: 'higiena', field: 'vana_dns' },
      12: { category: 'higiena', field: 'daleja_apmazgasana' },
      13: { category: 'higiena', field: 'velas_maina' },
      14: { category: 'higiena', field: 'nagu_kopsana' },
      15: { category: 'higiena', field: 'matu_kopsana' },
      16: { category: 'higiena', field: 'bardas_skushana' },
      17: { category: 'aktivitate', field: 'parvietojas_ar_palidzlekli' },
      18: { category: 'aktivitate', field: 'stav_ar_palidziigu' },
      19: { category: 'aktivitate', field: 'sedz_ar_palidziigu' },
      20: { category: 'edinasana', field: 'brokastis' },
      21: { category: 'edinasana', field: 'pusdienas' },
      22: { category: 'edinasana', field: 'launags' },
      23: { category: 'edinasana', field: 'vakariņi' },
      24: { category: 'sikdrumi', field: 'urina_daudzums' },
      25: { category: 'sikdrumi', field: 'uznemts_ml' },
      26: { category: 'citsi_pasakomi', field: 'adas_kopsana' },
      27: { category: 'fiziologija', field: 'vedera_izeja' },
      28: { category: 'citsi_pasakomi', field: 'pastaigas' },
      29: { category: 'citsi_pasakomi', field: 'ciemini' },
      30: { category: 'citsi_pasakomi', field: 'autins_biksitu_skaits' },
      31: { category: 'paraksts', field: 'aprupetaja_paraksts' }
    };
    return map[row];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExcelExporter;
}
if (typeof globalThis !== 'undefined') {
  globalThis.ExcelExporter = ExcelExporter;
}
