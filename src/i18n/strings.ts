export type Lang = 'en' | 'ms' | 'ja'
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'ms', label: 'Bahasa Melayu' },
  { id: 'ja', label: '日本語' },
]

/** UI text. English is the fallback for anything missing. */
export const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    start: 'Start Game', multiplayer: 'Multiplayer', charOption: 'Character Option', settings: 'Settings', credits: 'Credits', exit: 'Exit',
    sysSetting: 'System Setting', status: 'Status', charaEdit: 'Chara Edit', props: 'Props', weather: 'Weather', language: 'Language',
    missions: 'Missions', room: 'Room', backTitle: 'Back to Title', leaveRoom: 'Leave room', areaMove: 'Area Move', charChange: 'Character Change',
    size: 'Size', camera: 'Camera, Effect', pose: 'Pose mode', item: 'Item', hide: '_Hide', wave: 'Wave', cheer: 'Cheer', sit: 'Sit', bow: 'Bow', stop: 'Stop',
    time: 'Time of day', sunny: 'Sunny', cloudy: 'Cloudy', rainy: 'Rainy', done: 'Done', reward: 'Reward', place: 'Place',
    wearing: 'Wearing', putOn: 'Tap to wear or take off', missionsInfo: 'Do things around town to earn money.', money: 'Money',
    sunnyDay: 'Day', radar: 'Radar', jump: 'JUMP', action: 'ACTION', zoom: 'ZOOM', put: 'PUT',
  },
  ms: {
    start: 'Mula Main', multiplayer: 'Berbilang Pemain', charOption: 'Pilihan Watak', settings: 'Tetapan', credits: 'Kredit', exit: 'Keluar',
    sysSetting: 'Tetapan Sistem', status: 'Status', charaEdit: 'Edit Watak', props: 'Prop', weather: 'Cuaca', language: 'Bahasa',
    missions: 'Misi', room: 'Bilik', backTitle: 'Kembali ke Tajuk', leaveRoom: 'Keluar bilik', areaMove: 'Pindah Kawasan', charChange: 'Tukar Watak',
    size: 'Saiz', camera: 'Kamera, Kesan', pose: 'Mod Aksi', item: 'Barang', hide: '_Sorok', wave: 'Lambai', cheer: 'Sorak', sit: 'Duduk', bow: 'Tunduk', stop: 'Henti',
    time: 'Waktu', sunny: 'Cerah', cloudy: 'Mendung', rainy: 'Hujan', done: 'Siap', reward: 'Ganjaran', place: 'Letak',
    wearing: 'Dipakai', putOn: 'Ketik untuk pakai atau tanggal', missionsInfo: 'Lakukan sesuatu di bandar untuk dapat wang.', money: 'Wang',
    sunnyDay: 'Hari', radar: 'Radar', jump: 'LOMPAT', action: 'AKSI', zoom: 'ZUM', put: 'LETAK',
  },
  ja: {
    start: 'ゲーム開始', multiplayer: 'マルチプレイ', charOption: 'キャラクター設定', settings: '設定', credits: 'クレジット', exit: '終了',
    sysSetting: 'システム設定', status: 'ステータス', charaEdit: 'キャラ編集', props: '小物', weather: '天気', language: '言語',
    missions: 'ミッション', room: 'ルーム', backTitle: 'タイトルへ戻る', leaveRoom: 'ルームを出る', areaMove: 'エリア移動', charChange: 'キャラ変更',
    size: 'サイズ', camera: 'カメラ・エフェクト', pose: 'ポーズ', item: 'アイテム', hide: '_閉じる', wave: '手を振る', cheer: '万歳', sit: '座る', bow: 'お辞儀', stop: 'やめる',
    time: '時間', sunny: '晴れ', cloudy: 'くもり', rainy: '雨', done: '達成', reward: '報酬', place: '置く',
    wearing: '装備中', putOn: 'タップで着脱', missionsInfo: '街で行動してお金を貯めよう。', money: 'お金',
    sunnyDay: '日', radar: 'レーダー', jump: 'ジャンプ', action: 'アクション', zoom: 'ズーム', put: '置く',
  },
}
