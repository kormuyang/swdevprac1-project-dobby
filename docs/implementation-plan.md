# แผนพัฒนา Dobby สำหรับสองคน

สถานะ: พร้อมใช้แบ่งงานตามสัญญาที่กำหนดแล้ว ยังไม่ได้พัฒนา backend หรือรัน acceptance tests ผู้รับผิดชอบที่ยืนยันแล้ว: Saint = A และ Poom = B โดยคงรหัสงาน A/B เดิม ไม่จำเป็นต้องมีโฟลเดอร์ตัวอย่างหรือไฟล์ใน Downloads

## เปิดอ่านก่อนเริ่ม

1. [Practices](practices.md) — วิธีทำงานที่ทั้งคู่ต้องใช้
2. [Requirements](requirements.md) และ [decisions](decisions.md) — พฤติกรรมที่ตกลงแล้ว
3. [API contract](api-contract.md), [endpoint inventory](api-endpoints.md), [OpenAPI](contracts/openapi.json)
4. [Data model](data-model.md) และ [service contracts](service-contracts.md)
5. [Acceptance checklist](acceptance-checklist.md)
6. แต่ละคนใช้ [handoff A](handoffs/partner-a.md) หรือ [handoff B](handoffs/partner-b.md)

สัญญาชุดนี้กำหนด field names, enums, errors, dates, money, module names, ownership และ service signatures แล้ว ไม่ต้องออกแบบใหม่คนละชุด หากต้องแก้ให้เสนอเปลี่ยนสัญญาและให้คู่ตรวจ ก่อน merge งานที่พึ่งพากัน

## การแบ่งขอบเขต

| คน | รับผิดชอบหลัก | ไม่ควรแก้ข้ามเจ้าของโดยไม่คุย |
| --- | --- | --- |
| Saint (A) | scaffold/config, auth/JWT sessions, User/Provider/Application/Session, review/versioning, suspension orchestration, shared transaction/error infrastructure | Vehicle/Booking models, booking rules/cancellation implementation |
| Poom (B) | dates/money, Vehicle/Booking, public discovery, own-vehicle management, booking/customer/admin/company views, cancellation primitive | auth/provider application models, app/server/transaction infrastructure |
| ทั้งคู่ | review, integration, race checks, Postman demo, diagrams ของโมดูลตนเอง | ไฟล์กลางมี owner A เป็นคนรวม ไม่แก้ซ้อนกัน |

A ดูสถานะบริษัทและเปิด transaction ของ suspension; B ให้ฟังก์ชันยกเลิก booking ที่รับ session เดียวกัน ห้ามเขียน cancellation ซ้ำคนละชุด ห้ามให้ booking service เรียก provider service จนเกิด circular dependency

## เริ่มแยกงานได้อย่างไร

ทำ commit เอกสารสัญญาชุดนี้เป็นฐานร่วม แล้วเปิด branch งานของแต่ละคนจากฐานเดียวกัน หากยังไม่มี Git ให้คนใดคนหนึ่ง initialize shared repo ก่อน ทั้งสองคนใช้คนละ clone/worktree และคนละ Atlas database

- **A เริ่ม A00** สร้าง scaffold และ error contract ก่อน เป็น PR สั้นให้ B ใช้ต่อ
- **B เริ่ม B00 ได้ทันที** เขียน date/money rules, test cases และแบบ schema ตามสัญญา ไม่ต้องรอ auth หรือ API ของ A
- เมื่อ A00 merge ให้ B sync แล้วต่อ B01/B02 ระหว่างที่ A ทำ A01/A02
- ไม่ต้องรอ feature ทั้งหมดของอีกคนเพื่อเริ่มทดสอบโมดูลตนเอง แต่ fake actor/dependency ใช้เฉพาะ tests และไม่นับเป็น integration สำเร็จ

A00 เป็น dependency เล็กที่ระบุชัด ไม่ใช่ช่วงที่ต้องนั่ง pair เขียนทุกอย่างร่วมกัน B00 สามารถเริ่มเขียน tests/helpers ตามชื่อ export ล่วงหน้า แล้วเชื่อม ApiError หลัง A00 พร้อมได้

## งานของ A

| ID | งานและไฟล์ที่เป็นเจ้าของ | รับเข้า/ส่งออก | Dependencies | ตรวจรับ |
| --- | --- | --- | --- | --- |
| A00 | package.json/lock, .nvmrc, app.js/server.js, config/db.js/env.js, utils/ApiError.js, middleware/error.js, base runTransaction wrapper, health/docs; ใช้/ต่อยอด scripts/check-contract.js ที่มีแล้ว | Express app ไม่ listen ตอน import; error class; dev/start/test scripts; โหลด OpenAPI กลาง | เอกสารชุดนี้ | ติดตั้งด้วย Node 24, start รอ DB, unit tests ไม่ต่อ DB, health/docs และ safe errors ใช้ได้ |
| A01 | models/User.js, Provider.js, ProviderApplication.js, AuthSession.js; auth service/controller/router/middleware; auth validators/serializers | JWT session + req.actor ตาม service contract; signup customer/company; login/logout/me | G0: A00+B00 | T01–T06, T11, ส่วน auth ของ T36/T38; rejected/pending อ่านคำขอตนเองได้ |
| A02 | company application/profile และ admin review routes/controllers/services; indexes/history | immutable versions, one pending, approved pointer; admin queue/detail/review | A01; B00 dates helper | T07–T10 และ concurrent submission; ไม่อนุมัติแล้วปลด suspend |
| A03 | services/transactions.js และ shared guard helpers; provider suspend/reactivate orchestration | transaction API และ cancelNonCompletedForProvider call ตามสัญญา | A01; B00; B01 models; B03 cancellation primitive สำหรับ integration จริง | T33–T37 ร่วม B; rollback, no stale-token access, no restore |
| A04 | scripts/seed.js/reset-test-db.js, root setup README, .env.example; รวม routes ทั้งระบบใน app.js | admin/users/providers fixtures, DB safety guard, verified commands | A00–A03 + B models/routes | clean setup/reset ใช้งานได้, ไม่ reset DB ผิดชื่อ, T38 ร่วม B |
| A05 | auth/provider use cases, sequence/API diagram sources, collection folders ของ A; ตรวจ PR ฝั่ง B | เอกสารตรง code และ contribution evidence | feature ที่เกี่ยวข้องพร้อม | ส่วน A ของ T40–T42; ตรวจผล test ไม่ใช่ดูแค่ response 200 |

## งานของ B

| ID | งานและไฟล์ที่เป็นเจ้าของ | รับเข้า/ส่งออก | Dependencies | ตรวจรับ |
| --- | --- | --- | --- | --- |
| B00 | utils/dates.js/money.js และ pure unit tests; serializers/validation design | todayBangkok, inclusiveDays, overlaps, bookingStatus, calculateTotal ตามสัญญา | เอกสาร; A00 ApiError เพื่อ run tests | T19 และ calendar/money boundaries, same day, 30/31 days, timezone, cancelled/completed |
| B01 | models/Vehicle.js/Booking.js, serializers และ feature validators | exact persisted fields/indexes/DTOs ตามสัญญา | A00 package/config; A01 model refs สำหรับ integration | unique VIN, immutable fields, no password/private leaks; indexes พร้อม |
| B02 | vehicle/discovery routes/controllers/services | public provider/vehicle lists; approved owner CRUD/window/activation | A01 protect/actor และ provider model; A03 guard API สำหรับ mutation integration | T12–T18, T39; pagination total ตรง filter, branch/rate snapshot ไม่ถูกแก้ย้อนหลัง |
| B03 | services/bookings.js, bookingCancellation.js และ routes/controllers/serializers | create/read/date-edit/cancel; cap/overlap; narrow cancellation primitive สำหรับ A03 | B00/B01, A01 auth, A03 transaction helpers | T19–T30; T22/T23 ต้องใช้ Atlas จริง; cancellation primitive พร้อมให้ A เชื่อม |
| B04 | company/admin scoped booking views และ integration/race tests | read-only company booking data; global admin scope | B03 + A03 integration | T25, T31–T39 โดยเฉพาะ race suspension/creation และ rollback |
| B05 | vehicle/booking use cases, sequence/API diagram sources, collection folders ของ B; ตรวจ PR ฝั่ง A | เอกสารและ contribution evidence | features พร้อม | ส่วน B ของ T40–T42; review การเชื่อม approval/booking/suspension |

## การแก้ dependency ที่ดูเป็นวงกลม

A03 และ B03 แยกเป็นสอง PR ต่อคน:

1. **A03a:** transaction/guard infrastructure เท่านั้น ไม่ import cancellation ของ B ที่ยังไม่มี
2. **B03a:** booking + cancellation primitive โดย import infrastructure ที่ merge แล้ว
3. **A03b:** suspension orchestration เรียก primitive ของ B ภายใน session เดียวกัน
4. **B03b/B04:** race/rollback/end-to-end checks ต่อระบบจริง

B02 mutation ใช้ A03a จึงทำ read/validation/tests ไว้ก่อนได้ ใน production ห้ามเหลือ no-op stubs หรือเส้นทางข้าม transaction เมื่อ dependency ยังไม่พร้อม

## Integration gates

| Gate | ต้องพร้อมก่อนถือว่าผ่าน |
| --- | --- |
| G0 contract/scaffold | ทั้งคู่ใช้ field/error/signature ชุดนี้; A00 และ B00 ผ่าน; lockfile/runtime ตรงกัน |
| G1 identities/review | login/logout/roles ใช้จริง; pending/rejected/versioning/privacy ผ่าน; A01/A02 |
| G2 inventory/booking | A03a+B01–B03a; approved vehicle, cap/overlap, pricing/snapshot และ cutoffs ผ่าน |
| G3 lifecycle consistency | A03b+B04; suspension+cancel atomic, ongoing emergency cancel, old tokens denied, no restore; race tests ผ่าน |
| G4 delivery | seed/reset, Swagger/collection, demo, diagrams/contributions, latency evidence; T01–T42 มีผลตรวจ |

## วิธีทำ Git/รีวิว/สัญญา

ใช้ branch ตาม task เช่น feat/a01-auth หรือ feat/b03-bookings และ PR เล็ก อ้าง task/FR/test IDs พร้อมสิ่งที่เปลี่ยนและผลตรวจ owner ของไฟล์กลางเป็นคนรวม: A ดู package/app/config/contracts; B เสนอ contract changes ผ่าน PR ให้ A review ห้ามทั้งสองแก้ lockfileพร้อมกันโดยไม่มี owner

ก่อนเริ่มงานรอบใหม่ sync main ที่ผ่าน gate ล่าสุด อย่า merge งานอีกคนที่ยังไม่ review เพื่อแก้ dependency แบบเงียบ ๆ tests ใช้ synthetic fixtures และ DB ชื่อตัวเอง; ห้ามแชร์ collection mutable ระหว่าง dev สองคน

ทำเอกสารและ diagrams ควบคู่แต่ละ feature ไม่รวมไปให้คนเดียวเขียนท้ายสุด ทั้งคู่ต้องเขียน code และ docs ตาม syllabus บันทึก contribution จริง ไม่สมมติว่าได้คนละ 50%

## ขอบเขตคำสั่งที่จะต้องทำให้ใช้ได้ใน A00/A04

ตอนนี้รัน `node scripts/check-contract.js` ได้แล้วโดยไม่ติดตั้ง dependencies ส่วนคำสั่ง npm ด้านล่างเป็น **สัญญาของ scaffold ที่ต้องสร้าง ยังรันจาก planning package นี้ไม่ได้**:

```text
npm ci
npm run dev
npm start
npm run check:contract
npm run test:unit
npm run test:integration
npm run seed
npm run reset:test
npm run test:demo
```

test:integration และ reset:test ต้องใช้ TEST_MONGO_URI พร้อมชื่อ dobby_test_<owner> และ explicit reset flag; seed รับเฉพาะ DB dev/test ที่ระบุ ไม่ seed production โดยอนุมานเอง test:demo เป็น Newman หลังมี collection จริง

## สิ่งที่แผนนี้ยังไม่ได้อ้างว่าทำแล้ว

ยังไม่มี backend implementation, package installation, live API tests, Atlas validation หรือผล T01–T42 เอกสาร/API contract/ขอบเขตงานพร้อมให้เริ่มแล้ว การทำ feature และผ่าน gates เป็นงานของการพัฒนาตามแผน ไม่ต้องมี example/ เพื่อทำงานเหล่านี้
