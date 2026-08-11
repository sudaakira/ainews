# 新サービス発掘エージェント

公開Web情報から新しいサービスを収集し、注目度の高い3件を日本語で要約してMicrosoft 365メールで届けます。

## 動作

- 毎日 **08:30 / 17:30（日本時間）** にGitHub Actionsで実行
- Hacker News、GitHub、新着RSS（Product Huntなど）を収集
- URL・タイトルを正規化して重複排除
- 鮮度、反応、プロダクトらしさ、情報源を基に0〜100点で採点
- 上位3件を1回のLLM呼び出しで日本語化（API費用を抑制）
- Microsoft Graph APIでHTMLメールを送信
- 過去90日分の送信履歴を保存し、朝便・夕方便の重複を防止

Copilot Studioは利用しないため、この構成自体はCopilot Creditsを消費しません。GitHub Actions、LLM API、Microsoft 365には、それぞれの契約・利用枠が適用されます。

## 1. GitHubへ登録

このフォルダーの内容を、新しいGitHubリポジトリへpushします。重複検知履歴を更新するため、Actionsの`contents: write`権限を使用します。

組織のポリシーで書き込みが禁止されている場合は、リポジトリの **Settings → Actions → General → Workflow permissions** も確認してください。

## 2. Microsoft Entra IDの設定

1. Microsoft Entra管理センターで **アプリの登録 → 新規登録**。
2. 作成したアプリの **APIのアクセス許可** を開く。
3. Microsoft Graphの **アプリケーションの許可** から `Mail.Send` を追加。
4. 管理者の同意を付与。
5. **証明書とシークレット** でクライアントシークレットを作成。
6. 次の値を控える。
   - ディレクトリ（テナント）ID
   - アプリケーション（クライアント）ID
   - クライアントシークレットの「値」

> `Mail.Send`のアプリケーション権限は強い権限です。本番利用では、Exchange Online側でこのアプリが送信できるメールボックスを専用送信者に限定してください。シークレットはGitHub Secrets以外へ保存しないでください。

## 3. GitHub Secrets

リポジトリの **Settings → Secrets and variables → Actions** で次を登録します。

| Secret | 内容 |
|---|---|
| `OPENAI_API_KEY` | LLM APIキー |
| `AZURE_TENANT_ID` | Microsoft EntraテナントID |
| `AZURE_CLIENT_ID` | 登録アプリのクライアントID |
| `AZURE_CLIENT_SECRET` | 登録アプリのクライアントシークレット |
| `MAIL_SENDER` | Microsoft 365の送信元メールアドレス |
| `MAIL_RECIPIENT` | 宛先。複数の場合はカンマ区切り |

`GITHUB_TOKEN`はGitHub Actionsが自動発行するため、手動登録は不要です。

## 4. GitHub Variables（任意）

| Variable | 初期値 | 説明 |
|---|---|---|
| `OPENAI_MODEL` | `gpt-4.1-mini` | 使用可能な低価格モデル名へ変更可能 |
| `RSS_FEEDS` | 内蔵値 | カンマ区切りのRSS URL |

モデルの提供状況・料金は契約中のLLMプロバイダーで確認してください。OpenAI互換エンドポイントをローカルで使う場合は、環境変数`OPENAI_BASE_URL`も指定できます。

## 5. テスト送信

GitHubの **Actions → New Service Scout → Run workflow** から手動実行します。成功後、HTMLメールと`data/seen.json`の自動コミットを確認してください。

ローカルでメールを送らず確認する場合：

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DRY_RUN=true
export GITHUB_TOKEN=your_github_token  # 省略可能だがAPI制限が厳しくなる
python src/main.py
```

LLMキーを設定しない場合は、取得した説明文をそのまま使うフォールバック動作になります。

## カスタマイズ

`.github/workflows/scout.yml`の環境変数で変更できます。

- `LOOKBACK_HOURS`: 各回の探索範囲（初期値18時間）
- `RESULT_LIMIT`: メール掲載数（初期値3件）
- `MIN_SCORE`: 掲載最低点（初期値35点）
- `RSS_FEEDS`: 追加巡回するRSS

実行時刻はcronの`30 23,8 * * *`です。GitHub ActionsのcronはUTCなので、これは日本時間の08:30と17:30に相当します。スケジュール実行は混雑時に遅延することがあります。

## 注意

- 各サイトの利用規約、robots.txt、APIレート制限を守ってください。
- 現在はAPIとRSSを優先し、ログインが必要なページのスクレイピングは行いません。
- 自動要約には誤りがあり得るため、メールには必ず元URLを掲載します。
- Product HuntなどのRSS仕様が変わった場合は、`RSS_FEEDS`を差し替えてください。
