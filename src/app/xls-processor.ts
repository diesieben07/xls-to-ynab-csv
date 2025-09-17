import { Injectable } from '@angular/core';
import XLSX, { type CellAddress, type DenseWorkSheet, type Range, type WorkSheet } from 'xlsx';

export class XlsProcessError extends Error {
  constructor(message: string, at?: CellAddress) {
    super(at == null ? message : `${message} at ${XLSX.utils.encode_cell(at)}`);
  }
}

export interface RawTransaction {
  date: string;
  payee: string;
  amount: string;
}

type HeaderRowColumns = {
  [K in keyof RawTransaction]: number;
};

interface HeaderRowData extends HeaderRowColumns {
  row: number;
}

const headerMap = new Map<string, keyof HeaderRowData>([
  ['Datum', 'date'],
  ['Beschreibung', 'payee'],
  ['Betrag', 'amount'],
]);

export interface ProcessResult {
  csv: Blob | null;
  transactions: RawTransaction[] | null;
  errors: string[];
}

@Injectable({
  providedIn: 'root',
})
export class XlsProcessor {
  async process(file: Blob): Promise<ProcessResult> {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'buffer', dense: true });
      if (wb.SheetNames.length !== 1) {
        throw new XlsProcessError('Must have exactly one sheet.');
      }
      const sheet = wb.Sheets[wb.SheetNames[0]] as WorkSheet & DenseWorkSheet;
      const ref = sheet['!ref'];
      if (ref == null) throw new Error('Sheet has no range.');
      const range = XLSX.utils.decode_range(ref);
      const headerRow = this.#findHeaderRow(sheet, range);
      return this.#generateCsv(sheet, range, headerRow);
    } catch (e) {
      console.error('Error during parsing', e);
      return {
        csv: null,
        transactions: null,
        errors: [String(e)],
      };
    }
  }

  async #generateCsv(
    sheet: WorkSheet & DenseWorkSheet,
    range: Range,
    headerRowData: HeaderRowData,
  ): Promise<ProcessResult> {
    const errors: string[] = [];
    const transactions = Array.from(this.#getTransactions(sheet, range, headerRowData, errors));
    const rows = transactions.map((t) => this.#csvLine(t));
    rows.unshift(`"Date","Payee","Memo","Amount"\n`);
    const csv = new File(rows, 'amazon_visa.csv', {
      type: 'text/csv',
    });
    return { csv, transactions, errors };
  }

  *#getTransactions(
    sheet: WorkSheet & DenseWorkSheet,
    range: Range,
    headerRowData: HeaderRowData,
    errors: string[],
  ): Iterable<RawTransaction> {
    for (let row = headerRowData.row + 1; row <= range.e.r; row++) {
      if (sheet['!rows']?.[row]?.hidden) continue;
      let transaction: RawTransaction;
      try {
        transaction = this.#parseTransaction(sheet, row, headerRowData);
      } catch (e) {
        if (e instanceof XlsProcessError) {
          errors.push(e.message);
          continue;
        } else {
          throw e;
        }
      }
      yield transaction;
    }
  }

  #csvLine(transaction: RawTransaction): string {
    return `"${transaction.date}","${transaction.payee.replaceAll('"', '""')}","",${transaction.amount}"\n`;
  }

  #findHeaderRow(sheet: DenseWorkSheet, range: Range): HeaderRowData {
    nextRow: for (let row = range.s.r; row <= range.e.r; row++) {
      const potential: HeaderRowData = {
        row,
        date: -1,
        amount: -1,
        payee: -1,
      };
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cell = sheet['!data'][row]?.[col];
        if (cell == null || cell.t !== 's' || typeof cell.v !== 'string') {
          continue;
        }
        const targetField = headerMap.get(cell.v);
        if (targetField != null) {
          potential[targetField] = col;
        }
      }
      for (const field of headerMap.values()) {
        if (potential[field] === -1) continue nextRow;
      }
      return potential;
    }
    throw new Error('Failed to find header row.');
  }

  #parseTransaction(sheet: DenseWorkSheet, row: number, headerData: HeaderRowData): RawTransaction {
    const dateAt: CellAddress = { r: row, c: headerData.date };
    const date = this.#transformDate(this.#getString(sheet, dateAt), dateAt);
    const payee = this.#getString(sheet, { r: row, c: headerData.payee });
    const amountAt: CellAddress = { r: row, c: headerData.amount };
    const amount = this.#transformAmount(this.#getString(sheet, amountAt), amountAt);
    return {
      date,
      payee,
      amount,
    };
  }

  #getString(sheet: DenseWorkSheet, at: CellAddress): string {
    const cell = sheet['!data'][at.r]?.[at.c];
    if (cell == null || cell.t !== 's' || typeof cell.v !== 'string') {
      throw new XlsProcessError('Expected string', at);
    }
    return cell.v;
  }

  #transformDate(raw: string, at: CellAddress): string {
    const match = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(raw);
    if (match == null) throw new XlsProcessError(`Invalid date`, at);
    const [, d, m, y] = match;
    return `${m}/${d}/${y}`;
  }

  #transformAmount(raw: string, at: CellAddress): string {
    const match = /^(?:(-)?|\+)(\d+),(\d{2})\s*€$/.exec(raw);
    if (match == null) throw new XlsProcessError('Invalid amount', at);
    const [, minus, euro, cents] = match;
    return `${minus ?? ''}${euro}.${cents}`;
  }
}
