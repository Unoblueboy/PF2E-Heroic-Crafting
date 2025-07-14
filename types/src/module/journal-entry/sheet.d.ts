import appv1 = foundry.appv1;
declare class JournalSheetPF2e<TJournalEntry extends JournalEntry> extends appv1.sheets.JournalSheet<TJournalEntry> {
    /** Start pagination at 1 🤫 */
    getData(options?: Partial<appv1.api.DocumentSheetV1Options>): Promise<appv1.sheets.JournalSheetData<TJournalEntry>>;
}
export { JournalSheetPF2e };
