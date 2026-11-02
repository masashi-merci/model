# Supabase読み取りチェック（有効化済み）

`automation-drafts/supabase-readonly-healthcheck.yml` はレビュー用の控えです。本番の `.github/workflows/supabase-readonly-healthcheck.yml` では、承認済みの1日3回のscheduleを有効にしました。既存のPublishable keyをGitHub Actions secret `SUPABASE_PUBLIC_ANON_KEY` に設定し、[手動実行 #1](https://github.com/masashi-merci/model/actions/runs/41414346034) でHTTP 200・初回試行成功（読み取り1,419 ms、ジョブ全体23秒）を確認してから有効化しています。キー値はリポジトリに含めません。

## 提案する動作

- 1日3回、UTC 01:17 / 09:17 / 17:17（日本時間10:17 / 18:17 / 翌02:17）。混雑しやすい毎時0分を避けた8時間間隔です。
- 対象は既存の `mercimodel`（`mgmsqcveercjqbmlqnlt`）。`GET /rest/v1/news?select=id&active=eq.true&limit=1` で公開ニュースのIDを最大1件だけ要求します。
- 既存のpublishable key、または同じプロジェクトのlegacy anon keyを使用します。サービスロール、secret key、個人ログイン用トークンは拒否します。RLSを回避しません。
- 書き込み、ログイン、メール送信は行いません。レスポンス本文、ID、キー、ヘッダーはログへ出さず、HTTPステータス・試行回数・所要時間だけを記録します。ニュース0件も正常です。
- 各要求は15秒のタイムアウト。ネットワーク障害、429、一部5xxのみ最大3回（再試行待ち2秒・4秒）。401/403などは即失敗。リダイレクトは追いません。ジョブ全体は3分で打ち切ります。
- `workflow_dispatch` は、有効化後にGitHub Actionsから同じ読み取りチェックを手動実行するための入口です。

## 運用・設定変更時の確認手順

1. オーナーが対象・時刻・読み取り内容を確認し、有効化を明示的に承認する。
2. `news` の公開読み取り用RLSを確認する。失敗してもこのチェックのためにRLSを弱めない。
3. GitHub Actions secret `SUPABASE_PUBLIC_ANON_KEY` に、既存のpublishable/anon keyを設定する。コード・チャット・ログへ値を書かない。新しいキーやサービスロールを作らない。
4. レビュー済みファイルを `.github/workflows/supabase-readonly-healthcheck.yml` に移す変更を、通常のレビュー経由でdefault branchへ反映する。これが有効化操作になる。必要なら最初はscheduleを外し、manual-onlyで検証してから別途有効化する。
5. 手動実行の成功と、後続のscheduled runを確認する。失敗通知の受信者はGitHub側の既存設定を確認する。通知設定はこの下書きでは変更しない。

### 既存の公開キーを設定する経路

現在のアプリは `merci-talent-agency/src/lib/supabase.ts` から `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を読み込みます。Cloudflare PagesのProductionにはこの設定があり、GitHub Actionsへ自動的に引き継がれるものではありません。

有効化の承認後、所有者のSupabaseダッシュボードで対象プロジェクトのAPI Keysを開き、**既存のPublishable key、またはLegacy anon key**を選びます。GitHubの `masashi-merci/model` → Settings → Secrets and variables → Actions で、repository secret `SUPABASE_PUBLIC_ANON_KEY` として設定します。workflowはこのsecretをプロセス環境変数 `SUPABASE_PUBLIC_KEY` に渡します。値をチャットに送る必要はありません。既存キーのローテーション、新規キーの発行、Cloudflare変数の変更は不要です。既存のPublishable keyを同名のGitHub secretに設定済みです。キー値は本文やリポジトリに記録しません。

## 限界

これは低負荷な可用性チェック案です。今回のログイン遅延がSupabaseの休止・コールドスタートに起因することは確認できていません。実行しても応答速度改善や休止防止を保証しません。

GitHubのscheduleは遅延し、負荷が高い場合は欠落することがあります。default branch上のworkflowだけが対象です。**公開リポジトリでは60日間リポジトリ活動がないと自動無効化**されます。これらを回避するための自動コミット等は行いません。[GitHub公式schedule仕様](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

SupabaseはFree Planで7日間の低活動を理由に休止する場合があると説明しています。本案がその判定を満たす保証はありません。[Supabase公式Availability](https://supabase.com/docs/guides/deployment/going-into-prod#availability)

Publishable/anonは公開アクセス用で、RLSによる制限が必要です。サービスロール/secret keyは使用しません。[Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)

## オフライン検証

```sh
cd merci-talent-agency
python3 -m unittest discover -s tests -p 'test_healthcheck.py' -v
```

テストは通信をモック化し、GETの対象・1件制限・タイムアウト・再試行上限・特権キー拒否・本文非取得・ログ非露出を検証します。本番へリクエストは送りません。
