# 共通・条件回帰ループ 3D 競馬シミュレーター

**同じ画面・馬モデル・走行アニメーション・採点・着順シミュレーションを、レース設定ファイルだけで流用するためのエンジンです。**

## 公開ページ

- [2026 スワンステークス](https://sudaakira.github.io/ainews/race-engine/?race=swan-2026)
- [架空6頭サンプル](https://sudaakira.github.io/ainews/race-engine/?race=sample-demo) — 動作確認用。実在の馬・競走ではありません。
- 旧URL `/swan-2026/` は共通版へ自動転送します。独立した旧実装は `/swan-2026/legacy.html` に保存。

## 新しいレースの登録手順

1. `race-engine/races/sample-demo.js` をコピーし、`<race-id>.js` として追加
2. `id`、`name`、`date`、`venue`、`raceNumber`、`surface`、`distance`、`course` を入力
3. `horses` に**確定した出走馬を馬番順で3〜18頭**入力（取消・除外反映）。`no` は1からの連番
4. 過去走や調教等の証拠があるときだけ `inputs` を追加。情報がない場合は省略し、中立点とする
5. 必ず `demo:false` を指定し、出馬表などの一次資料を `notes` や `sources` に記載
6. コミットすると GitHub Actions が検証・公開。`/race-engine/?race=<race-id>` を開く

### 設定ファイルの最小構成

```js
export default {
  schemaVersion: 1,
  id: 'example-2026',
  name: '対象レース名',
  shortName: '略称',
  date: '2026-10-12',
  venue: '東京',
  raceNumber: 11,
  surface: '芝',
  distance: 1800,
  course: '左回り',
  courseView: 'generic', // 京都芝1400m外のみ 'kyoto-1400-outer'
  duration: 105,
  demo: false,
  notes: '出走馬・騎手・枠順を確認済み。未取得要素は中立。',
  horses: [
    // {no:1,name:'...',age:'牡4',kg:57,j:'...',trainer:'...',
    //  father:'...',mfather:'...',rest:null,training:null,
    //  style:'好位',base:null,sd:10,history:'...',plus:'...',minus:'...'},
    // ... 馬番2〜末尾まで
  ],
  inputs: {
    // 馬番: [同コース,ラップ,父/母父の暫定血統,厩舎,距離適性]
    // 必要な証拠なしに数値を埋めないこと
  },
  speedAdapt: {}, // 超高速馬場の適性。根拠がないとき空
  factors: {
    // draw: [null,{n: 出走数,p3: 3着以内数},...],  // 該当コースの過去データだけ
    // sex: {female:{n:出走数,p3:3着以内数},other:{...}},
    // riders: {'騎手名':[1着,2着,3着,その他]},
    // riderROI: {'騎手名':複勝回収率}
  }
};
```

**注:** 上の構成には、現状のツールで取得済みのデータがない箇所を含めません。人気・オッズの模倣や架空の調教・血統点を作らないでください。確率は未校正のモデル内出現率であり、実的中確率を意味しません。

## 共通部品

| ファイル | 役割 |
|---|---|
| `core/factors.js` | 馬番→枠番号・騎手・性別・枠傾向。データ未取得は0点補正 |
| `core/regression.js` | 14項目100点評価、0〜2倍の配点調整 |
| `core/simulator.js` | シード固定で再現可能なモンテカルロ試算（3〜18頭） |
| `app.js` | 設定・順位表・詳細カルテ・2Dレース・CSV |
| `renderer.js` | 3D表示・追走カメラ・16倍速対応・可変頭数ゲート |
| `assets/horse-anime.js` | アニメ調のデフォルメ競走馬 |
| `assets/chibi-gallop.js` | 馬の走行アニメーション |
| `assets/kyoto-scenery.js` | 京都専用の背景（他コースに流用しない） |
| `races/*.js` | レースごとの設定と入力データ |

京都芝1400m外以外は**汎用3Dオーバル模式図**を使用します。別コースの高低差、右左回り、直線長、トラック幅などを厳密に再現するものではありません。コース別形状の増築は今後の拡張項目です。

## 検証

```sh
node race-engine/tests/smoke.mjs
```

GitHub Actions の公開工程でも実行します。18頭スワンSと6頭デモのサンプル数、14項目の配点、複勝圏延べ300%、固定シード再現性、UI/3Dの静的依存を確認します。WebGLブラウザでの視覚品質の検証とは別です。

## 依頼例

> 2026年○月○日の東京11Rを、`ainews/race-engine` の共通3Dエンジンで完全版条件回帰ループ予想して。確定出走馬・騎手・枠順・馬場・調教・5代血統・過去時計を確認し、未取得項目は中立にして `races/<race-id>.js` を作成。予想配点を調整可能にして GitHub Pages に公開、テストもして。
