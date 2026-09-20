import { ERROR_CODES, REQUEST_STATES, CATEGORIES } from "./contracts.js";
import { ROUTES } from "./routes.js";
import { CONTACT_FIXTURES, DETAIL_PRESETS, IMAGE_FIXTURES } from "./catalog.js";
export type Locale = "th" | "en";

// One explicit key contract. Both resources are derived from the same authored rows.
const COPY = {
  "brand.tagline": [
    "A thoughtful welcome. A personal beginning.",
    "การต้อนรับที่ใส่ใจ จุดเริ่มต้นในแบบคุณ",
  ],
  "app.prototype": [
    "Private concierge · synthetic prototype",
    "ผู้ช่วยต้อนรับส่วนตัว · ต้นแบบข้อมูลสมมติ",
  ],
  "app.demo": [
    "A space to explore, using sample details only.",
    "พื้นที่ทดลองบริการ โดยใช้รายละเอียดสมมติเท่านั้น",
  ],
  "nav.explore": ["Explore", "สำรวจบริการ"],
  "nav.request": ["My request", "คำขอของฉัน"],
  "nav.support": ["Help & privacy", "ช่วยเหลือและความเป็นส่วนตัว"],
  "nav.language": ["Language", "ภาษา"],
  "nav.all": ["All experiences", "บริการทั้งหมด"],
  "nav.back": ["Back", "ย้อนกลับ"],
  "nav.home": ["Back to welcome", "กลับหน้าต้อนรับ"],
  "nav.skip": ["Skip to content", "ข้ามไปเนื้อหา"],
  "hero.eyebrow": [
    "YOUR BANGKOK, THOUGHTFULLY CONSIDERED",
    "กรุงเทพฯ ในแบบที่คุณอยากใช้ชีวิต",
  ],
  "hero.title": [
    "A little less planning.\nA little more possibility.",
    "วางแผนให้น้อยลง\nเปิดรับสิ่งใหม่ได้มากขึ้น",
  ],
  "hero.description": [
    "A place to begin your next stay, move or everyday request. Share a few sample details with Lili, our digital reception helper.",
    "เริ่มต้นเรื่องที่พัก การเดินทาง หรือคำขอในชีวิตประจำวัน ด้วยรายละเอียดสมมติเพียงเล็กน้อยกับลิลิ ผู้ช่วยต้อนรับดิจิทัล",
  ],
  "hero.start": ["Meet Lili", "เริ่มต้นกับลิลิ"],
  "hero.explore": ["Explore the possibilities", "สำรวจบริการที่สนใจ"],
  "hero.art": [
    "An original geometric illustration of an arch, sun and quiet city.",
    "ภาพเรขาคณิตต้นฉบับของซุ้มโค้ง ดวงอาทิตย์ และเมืองอันเงียบสงบ",
  ],
  "hero.caption": [
    "ROOM FOR THE EVERYDAY. SPACE FOR THE UNEXPECTED.",
    "พื้นที่ให้ชีวิตประจำวัน และสิ่งใหม่ที่รออยู่",
  ],
  "section.services": ["What brings you here?", "วันนี้มีอะไรให้เราช่วยไหม"],
  "section.services.description": [
    "Six ways to begin. Every request starts with a conversation.",
    "เริ่มต้นได้จากหกหมวดบริการ ทุกคำขอเริ่มจากการรับฟัง",
  ],
  "section.process": ["A considered beginning", "เริ่มต้นอย่างใส่ใจ"],
  "process.one": ["Choose a direction", "เลือกสิ่งที่สนใจ"],
  "process.one.description": [
    "Start with what you need, using our sample choices.",
    "เลือกสิ่งที่ต้องการจากตัวเลือกสมมติ",
  ],
  "process.two": ["Share the essentials", "บอกเพียงสิ่งจำเป็น"],
  "process.two.description": [
    "A few relevant details, followed by your explicit choice.",
    "รายละเอียดที่เกี่ยวข้อง และการตัดสินใจด้วยตัวคุณเอง",
  ],
  "process.three": ["Leave room for review", "รอการพิจารณา"],
  "process.three.description": [
    "A truthful pending state. No availability or booking is implied.",
    "แสดงสถานะรอพิจารณาตามจริง โดยไม่สื่อว่ามีบริการว่างหรือจองแล้ว",
  ],
  "category.condo": ["Condo", "คอนโด"],
  "category.condo.description": [
    "Find your rhythm in a new neighbourhood.",
    "ค้นพบจังหวะชีวิตในย่านใหม่",
  ],
  "category.hotel": ["Hotel", "โรงแรม"],
  "category.hotel.description": [
    "Make space for a well-considered stay.",
    "เริ่มต้นวางแผนการเข้าพักที่เหมาะกับคุณ",
  ],
  "category.airport_transfer": ["Airport transfer", "รถรับส่งสนามบิน"],
  "category.airport_transfer.description": [
    "A considered first and last mile.",
    "เริ่มต้นและจบทริปอย่างใส่ใจ",
  ],
  "category.car_with_driver": ["Car with driver", "รถพร้อมคนขับ"],
  "category.car_with_driver.description": [
    "A little more freedom in your day.",
    "เพิ่มความคล่องตัวให้วันของคุณ",
  ],
  "category.private_driver": ["Private driver", "คนขับส่วนตัว"],
  "category.private_driver.description": [
    "Plan the route around your priorities.",
    "วางแผนเส้นทางตามสิ่งที่สำคัญกับคุณ",
  ],
  "category.bespoke": ["Bespoke request", "คำขอพิเศษ"],
  "category.bespoke.description": [
    "For the details that do not fit a category.",
    "สำหรับรายละเอียดที่ไม่จำกัดอยู่ในหมวดใด",
  ],
  "discovery.kicker": ["A PLACE TO BEGIN", "เริ่มต้นจากสิ่งที่สนใจ"],
  "discovery.description": [
    "Explore an illustrative collection, then tell Lili what matters to you. These samples are not live inventory.",
    "สำรวจตัวอย่าง แล้วบอกลิลิว่าสิ่งใดสำคัญกับคุณ ตัวอย่างเหล่านี้ไม่ใช่รายการที่เปิดให้บริการจริง",
  ],
  "discovery.sample": ["Illustrative collection", "ชุดตัวอย่างสมมติ"],
  "discovery.detail": ["View sample details", "ดูรายละเอียดตัวอย่าง"],
  "discovery.begin": ["Begin a sample request", "เริ่มคำขอสมมติ"],
  "discovery.related": ["Continue exploring", "สำรวจต่อ"],
  "detail.description": [
    "A fictional space, created to help you explore the request journey. No price, availability or booking can be inferred.",
    "พื้นที่สมมติสำหรับทดลองขั้นตอนคำขอ ไม่สามารถอนุมานราคา บริการว่าง หรือการจองได้",
  ],
  "detail.property": [
    "The Courtyard · sample residence",
    "เดอะคอร์ตยาร์ด · ที่พักตัวอย่าง",
  ],
  "detail.hotel": [
    "The Quiet House · sample stay",
    "เดอะไควเอตเฮาส์ · โรงแรมตัวอย่าง",
  ],
  "lili.eyebrow": ["LILI · DIGITAL RECEPTION", "ลิลิ · ผู้ช่วยต้อนรับดิจิทัล"],
  "lili.welcome": [
    "Welcome. Let’s begin with what you have in mind.",
    "ยินดีต้อนรับค่ะ เริ่มจากสิ่งที่คุณกำลังมองหากันนะคะ",
  ],
  "lili.description": [
    "I’m Lili, your digital welcome and reception helper, working with ChatGPT / เจริญ. Choose a category and I’ll help organise a sample request for human review.",
    "ลิลิเป็นผู้ช่วยต้อนรับดิจิทัล ทำงานร่วมกับ ChatGPT / เจริญ เลือกหมวดบริการ แล้วลิลิจะช่วยจัดรายละเอียดคำขอสมมติไว้รอการพิจารณาจากเจ้าหน้าที่ค่ะ",
  ],
  "request.sample_only": [
    "Sample choices only. Please do not enter personal information.",
    "ใช้ตัวเลือกสมมติเท่านั้น โปรดไม่ระบุข้อมูลส่วนบุคคล",
  ],
  "request.details": ["Just the essentials", "เพียงรายละเอียดที่จำเป็น"],
  "request.details.description": [
    "Choose an example below. Each contains only the minimum details for this category.",
    "เลือกตัวอย่างด้านล่าง แต่ละตัวอย่างมีเพียงรายละเอียดขั้นต่ำสำหรับบริการนี้",
  ],
  "request.preset.one": ["Sample arrangement 01", "รูปแบบสมมติ 01"],
  "request.preset.two": ["Sample arrangement 02", "รูปแบบสมมติ 02"],
  "request.save_details": ["Save sample details", "บันทึกรายละเอียดสมมติ"],
  "request.edit": ["Edit sample details", "แก้ไขรายละเอียดสมมติ"],
  "request.edit_notice": [
    "Editing clears earlier notice, consent and saved images. You will choose again before review.",
    "การแก้ไขจะล้างการรับทราบ ความยินยอม และภาพที่บันทึก คุณต้องเลือกใหม่ก่อนส่งรอพิจารณา",
  ],
  "request.empty": [
    "Your next request begins here.",
    "เริ่มคำขอถัดไปของคุณที่นี่",
  ],
  "request.empty.description": [
    "There is no sample request in this session yet.",
    "ยังไม่มีคำขอสมมติในเซสชันนี้",
  ],
  "request.current": ["Your sample request", "คำขอสมมติของคุณ"],
  "request.resume": ["Resume request", "เปิดคำขอต่อ"],
  "request.new": ["Start another sample", "เริ่มคำขอสมมติใหม่"],
  "request.history": ["Saved in this session", "บันทึกไว้ในเซสชันนี้"],
  "request.continue": ["Continue", "ดำเนินการต่อ"],
  "request.contact": ["A sample contact", "ข้อมูลติดต่อสมมติ"],
  "request.contact.description": [
    "Choose the synthetic contact below. No person will be contacted.",
    "เลือกข้อมูลติดต่อสมมติด้านล่าง จะไม่มีการติดต่อบุคคลใด",
  ],
  "request.save_contact": [
    "Use this sample contact",
    "ใช้ข้อมูลติดต่อสมมตินี้",
  ],
  "fixture.contact.01": [
    "Sample Guest · fictional contact",
    "ผู้เข้าพักตัวอย่าง · ข้อมูลสมมติ",
  ],
  "fixture.contact.02": [
    "Sample Visitor · fictional contact",
    "ผู้มาเยือนตัวอย่าง · ข้อมูลสมมติ",
  ],
  "notice.title": ["A moment before we continue", "ก่อนดำเนินการต่อ"],
  "notice.body": [
    "This is a local prototype using synthetic data. A request does not guarantee availability, price, service, a booking or acceptance. No human has accepted this request. Human/Operations review would be required in an approved service.",
    "นี่คือต้นแบบภายในเครื่องที่ใช้ข้อมูลสมมติ คำขอไม่รับประกันบริการว่าง ราคา การให้บริการ การจอง หรือการรับคำขอ ยังไม่มีเจ้าหน้าที่รับคำขอนี้ บริการที่ได้รับอนุมัติจะต้องผ่านการพิจารณาจากเจ้าหน้าที่หรือฝ่ายปฏิบัติการ",
  ],
  "notice.acknowledge": [
    "I understand · continue to consent",
    "รับทราบ · ไปที่ความยินยอม",
  ],
  "consent.title": ["Your choice, clearly made", "การตัดสินใจที่ชัดเจนของคุณ"],
  "consent.review_required": [
    "REVIEW_REQUIRED · sample wording, pending legal review",
    "REVIEW_REQUIRED · ข้อความตัวอย่าง รอการตรวจทานทางกฎหมาย",
  ],
  "consent.body": [
    "Choose whether this local prototype may save your selected synthetic details and optional sample images, and move your sample request to pending review. This is a demonstration of consent, not approved legal wording. No data is sent to an operator or external service.",
    "เลือกว่าจะให้ต้นแบบภายในเครื่องบันทึกรายละเอียดสมมติและภาพตัวอย่างที่คุณเลือก และเปลี่ยนคำขอเป็นรอพิจารณาหรือไม่ นี่เป็นการสาธิตความยินยอม ไม่ใช่ข้อความกฎหมายที่อนุมัติแล้ว ไม่มีการส่งข้อมูลไปยังเจ้าหน้าที่หรือบริการภายนอก",
  ],
  "consent.version": [
    "Sample version: prototype-demo-v1",
    "รุ่นข้อความตัวอย่าง: prototype-demo-v1",
  ],
  "consent.accept": ["Accept", "ยอมรับ"],
  "consent.decline": ["Decline", "ปฏิเสธ"],
  "consent.declined": [
    "You declined. Your synthetic draft remains in local prototype storage; saved images were removed. Nothing was sent. Review is unavailable until you choose to accept.",
    "คุณเลือกปฏิเสธ ร่างคำขอสมมติยังอยู่ในต้นแบบภายในเครื่อง ภาพที่บันทึกถูกลบแล้ว ไม่มีการส่งข้อมูล คุณต้องยอมรับก่อนส่งรอพิจารณา",
  ],
  "consent.accepted": [
    "Your sample consent is saved. Nothing has been sent.",
    "บันทึกความยินยอมตัวอย่างแล้ว ยังไม่มีการส่งข้อมูล",
  ],
  "consent.recorded": [
    "Your recorded consent is shown below. This prototype does not offer changes after review.",
    "แสดงความยินยอมที่บันทึกไว้ด้านล่าง ต้นแบบนี้ไม่รองรับการเปลี่ยนแปลงหลังส่งรอพิจารณา",
  ],
  "consent.required": [
    "Complete the details and acknowledge the notice before choosing consent.",
    "กรอกรายละเอียดและรับทราบข้อชี้แจงก่อนเลือกความยินยอม",
  ],
  "review.title": ["Take a moment to review", "ตรวจทานรายละเอียดอีกครั้ง"],
  "review.description": [
    "Check your sample details before moving this request to pending review. No booking or notification takes place.",
    "ตรวจสอบรายละเอียดสมมติก่อนเปลี่ยนเป็นรอพิจารณา ไม่มีการจองหรือการแจ้งเตือน",
  ],
  "review.submit": ["Move to pending review", "เปลี่ยนเป็นรอพิจารณา"],
  "review.blocked": [
    "Accepted sample consent and a sample contact are needed before review.",
    "ต้องมีความยินยอมตัวอย่างและข้อมูลติดต่อสมมติก่อนส่งรอพิจารณา",
  ],
  "status.description": [
    "This is the latest saved state of your sample request.",
    "นี่คือสถานะล่าสุดที่บันทึกไว้ของคำขอสมมติ",
  ],
  "status.draft": ["Draft", "ร่างคำขอ"],
  "status.details_captured": ["Details captured", "บันทึกรายละเอียดแล้ว"],
  "status.consent_pending": [
    "Awaiting your consent choice",
    "รอการเลือกความยินยอม",
  ],
  "status.consented": ["Sample consent saved", "บันทึกความยินยอมตัวอย่างแล้ว"],
  "status.review_pending": ["Pending review", "รอพิจารณา"],
  "status.human_handoff_pending": [
    "Human handoff pending",
    "รอส่งต่อให้เจ้าหน้าที่",
  ],
  "status.pending_notice": [
    "No human has accepted or reviewed this request. No booking or service is confirmed.",
    "ยังไม่มีเจ้าหน้าที่รับหรือพิจารณาคำขอนี้ ไม่มีการยืนยันการจองหรือบริการ",
  ],
  "status.handoff": [
    "Request human / Operations handoff",
    "ขอส่งต่อให้เจ้าหน้าที่ / ฝ่ายปฏิบัติการ",
  ],
  "status.destination": [
    "Operations destination is not configured. Owner authorization is required. No operator was notified.",
    "ยังไม่ได้กำหนดปลายทางฝ่ายปฏิบัติการ ต้องได้รับอนุมัติจากเจ้าของ ยังไม่มีการแจ้งเตือนเจ้าหน้าที่",
  ],
  "status.handoff_note": [
    "The saved state is human handoff pending only. It does not mean a message was sent or a person accepted the request.",
    "บันทึกเพียงสถานะรอส่งต่อให้เจ้าหน้าที่ ไม่ได้หมายความว่าส่งข้อความแล้วหรือมีผู้รับคำขอ",
  ],
  "images.title": ["A few visual notes", "ภาพประกอบเล็กน้อย"],
  "images.description": [
    "Optional · up to 4 synthetic geometric images. Preview first; saving is available after consent.",
    "ไม่บังคับ · ภาพเรขาคณิตสมมติได้สูงสุด 4 ภาพ ดูตัวอย่างก่อนได้ และบันทึกได้หลังยินยอม",
  ],
  "images.preview": ["Preview", "ดูตัวอย่าง"],
  "images.save": ["Save image", "บันทึกภาพ"],
  "images.saved": ["Saved", "บันทึกแล้ว"],
  "images.saving": ["Saving…", "กำลังบันทึก…"],
  "images.failed": [
    "The image save could not be confirmed. Retry checks the same operation before refreshing your saved images.",
    "ยังยืนยันการบันทึกภาพไม่ได้ การลองใหม่จะตรวจสอบรายการเดิมก่อนโหลดภาพที่บันทึกล่าสุด",
  ],
  "images.retry": ["Retry save", "ลองบันทึกอีกครั้ง"],
  "images.remove": ["Remove image", "ลบภาพ"],
  "images.limit": [
    "Four images selected. Remove one to choose another.",
    "เลือกครบสี่ภาพแล้ว ลบภาพหนึ่งเพื่อเลือกภาพใหม่",
  ],
  "images.preview_only": [
    "Preview only · not saved",
    "ตัวอย่างเท่านั้น · ยังไม่บันทึก",
  ],
  "images.none": ["No saved images", "ยังไม่มีภาพที่บันทึก"],
  "fixture.image.01": ["Arch · sample illustration", "ซุ้มโค้ง · ภาพสมมติ"],
  "fixture.image.02": [
    "Courtyard · sample illustration",
    "ลานพักผ่อน · ภาพสมมติ",
  ],
  "fixture.image.03": ["Window · sample illustration", "หน้าต่าง · ภาพสมมติ"],
  "fixture.image.04": ["Sunrise · sample illustration", "อรุณรุ่ง · ภาพสมมติ"],
  "fixture.image.05": ["Garden · sample illustration", "สวน · ภาพสมมติ"],
  "support.description": [
    "A thoughtful prototype should make its boundaries easy to understand.",
    "ต้นแบบที่ใส่ใจควรทำให้ขอบเขตการทำงานเข้าใจง่าย",
  ],
  "support.local.title": [
    "A local, synthetic experience",
    "การทดลองภายในเครื่องด้วยข้อมูลสมมติ",
  ],
  "support.local.body": [
    "All sample requests stay in this local prototype. There are no live listings, customer contacts, payments, notifications or external services.",
    "คำขอสมมติทั้งหมดอยู่ในต้นแบบภายในเครื่อง ไม่มีรายการจริง การติดต่อลูกค้า การชำระเงิน การแจ้งเตือน หรือบริการภายนอก",
  ],
  "support.privacy.title": ["Only the essentials", "เก็บเพียงสิ่งจำเป็น"],
  "support.privacy.body": [
    "Choose only the provided synthetic details. No passports, identity documents, medical or financial information are requested. Your session can access only its own sample requests.",
    "เลือกเฉพาะรายละเอียดสมมติที่เตรียมไว้ ไม่มีการขอหนังสือเดินทาง เอกสารระบุตัวตน ข้อมูลสุขภาพหรือการเงิน เซสชันของคุณเข้าถึงได้เฉพาะคำขอสมมติของตนเอง",
  ],
  "support.operations.title": [
    "A human remains part of the journey",
    "เจ้าหน้าที่ยังคงเป็นส่วนหนึ่งของขั้นตอน",
  ],
  "support.operations.body": [
    "Lili helps organise a request. Human review and an authorized Operations destination would be needed for a live service. This prototype only records pending states.",
    "ลิลิช่วยจัดรายละเอียดคำขอ บริการจริงต้องผ่านการพิจารณาจากเจ้าหน้าที่และมีปลายทางฝ่ายปฏิบัติการที่อนุมัติ ต้นแบบนี้บันทึกเฉพาะสถานะรอเท่านั้น",
  ],
  "support.legal.title": [
    "Consent copy awaits review",
    "ข้อความความยินยอมรอการตรวจทาน",
  ],
  "support.legal.body": [
    "The demonstration consent is marked REVIEW_REQUIRED. It allows only the synthetic flow and is not approved legal language.",
    "ความยินยอมตัวอย่างมีป้าย REVIEW_REQUIRED ใช้ได้เฉพาะขั้นตอนข้อมูลสมมติ และไม่ใช่ข้อความกฎหมายที่อนุมัติแล้ว",
  ],
  "locale.description": [
    "Choose the language for this experience. Your selection stays with this session.",
    "เลือกภาษาสำหรับการใช้งาน ระบบจะจดจำตัวเลือกในเซสชันนี้",
  ],
  "locale.fallback": [
    "This page is shown in English because the selected translation is incomplete.",
    "หน้านี้แสดงภาษาอังกฤษ เนื่องจากคำแปลที่เลือกยังไม่ครบ",
  ],
  "app.loading": ["Preparing your welcome…", "กำลังเตรียมการต้อนรับ…"],
  "app.saving": ["Saving your choice…", "กำลังบันทึกตัวเลือก…"],
  "app.retry": ["Try again", "ลองอีกครั้ง"],
  "app.close": ["Close", "ปิด"],
  "app.offline": [
    "The local prototype could not be reached. A save may already have completed. Retry checks the same operation.",
    "ไม่สามารถเชื่อมต่อต้นแบบภายในเครื่องได้ รายการอาจบันทึกแล้ว การลองใหม่จะตรวจสอบรายการเดิม",
  ],
  "app.not_found": ["This page is not here.", "ไม่พบหน้านี้"],
  "app.not_found.description": [
    "Return to your welcome or explore the available sample journeys.",
    "กลับหน้าต้อนรับหรือสำรวจขั้นตอนตัวอย่างที่มี",
  ],
  "app.content_unavailable": [
    "Content is unavailable. Please reload this local prototype.",
    "ไม่สามารถแสดงเนื้อหาได้ โปรดโหลดต้นแบบภายในเครื่องใหม่",
  ],
  "app.request_unavailable": [
    "This sample request is unavailable in your session.",
    "คำขอสมมตินี้ไม่สามารถเปิดได้ในเซสชันของคุณ",
  ],
  "footer.note": [
    "Local prototype. Synthetic data only. No requests are delivered.",
    "ต้นแบบภายในเครื่อง ข้อมูลสมมติเท่านั้น ไม่มีการส่งคำขอออกไป",
  ],
  "footer.signature": [
    "Hospitality begins with listening.",
    "การต้อนรับเริ่มจากการรับฟัง",
  ],
  "field.intent": ["Intent", "ความต้องการ"],
  "field.area": ["Preferred area / BTS", "ย่าน / บีทีเอสที่สนใจ"],
  "field.budget": ["Sample budget range", "ช่วงงบประมาณสมมติ"],
  "field.bedrooms": ["Bedrooms", "ห้องนอน"],
  "field.timeframe": ["Move timeframe", "ช่วงเวลาย้ายเข้า"],
  "field.location": ["Location", "ทำเล"],
  "field.dates": ["Stay dates", "วันที่เข้าพัก"],
  "field.guests": ["Guests", "ผู้เข้าพัก"],
  "field.preferences": ["Basic preferences", "ความต้องการเบื้องต้น"],
  "field.pickup": ["Pickup", "จุดรับ"],
  "field.destination": ["Destination", "จุดหมาย"],
  "field.datetime": ["Date / time", "วัน / เวลา"],
  "field.passengers": ["Passengers", "ผู้โดยสาร"],
  "field.itinerary": ["General itinerary", "เส้นทางโดยรวม"],
  "field.description": ["Sample request", "คำขอสมมติ"],
  "field.timing": ["Timing", "ช่วงเวลา"],
  "field.contact": ["Sample contact", "ข้อมูลติดต่อสมมติ"],
  "field.consent": ["Consent", "ความยินยอม"],
  "field.images": ["Saved images", "ภาพที่บันทึก"],
  "value.rent": ["Rent", "เช่า"],
  "value.buy": ["Buy", "ซื้อ"],
  "value.sample_area_one": ["Sample neighbourhood A", "ย่านสมมติ ก"],
  "value.sample_area_two": ["Sample neighbourhood B", "ย่านสมมติ ข"],
  "value.sample_time_one": ["Next month · sample", "เดือนหน้า · สมมติ"],
  "value.sample_time_two": [
    "Within three months · sample",
    "ภายในสามเดือน · สมมติ",
  ],
  "value.sample_preference": ["Sample quiet room", "ห้องพักเงียบสมมติ"],
  "value.sample_preference_two": ["Garden view · sample", "วิวสวน · สมมติ"],
  "value.sample_pickup": ["Sample airport A", "สนามบินสมมติ ก"],
  "value.sample_destination": ["Sample hotel A", "โรงแรมสมมติ ก"],
  "value.sample_garden_lobby": ["Sample garden lobby", "ล็อบบี้สวนสมมติ"],
  "value.sample_itinerary": [
    "Half-day city route · sample",
    "เส้นทางในเมืองครึ่งวัน · สมมติ",
  ],
  "value.sample_itinerary_two": [
    "Full-day city route · sample",
    "เส้นทางในเมืองเต็มวัน · สมมติ",
  ],
  "value.sample_description": [
    "Dinner planning · sample",
    "วางแผนมื้อเย็น · สมมติ",
  ],
  "value.sample_description_two": [
    "City orientation · sample",
    "ทำความรู้จักเมือง · สมมติ",
  ],
  "value.sample_evening": ["Next evening · sample", "เย็นวันถัดไป · สมมติ"],
  "value.sample_week": ["Next week · sample", "สัปดาห์หน้า · สมมติ"],
  "value.not_selected": ["Not selected", "ยังไม่ได้เลือก"],
  "value.consent_unset": ["Not yet chosen", "ยังไม่ได้ตัดสินใจ"],
  "value.consent_accepted": [
    "Sample consent given",
    "ให้ความยินยอมตัวอย่างแล้ว",
  ],
  "value.consent_declined": ["Declined", "ปฏิเสธแล้ว"],
} as const;

const ROUTE_TITLES = [
  ["welcome", "Welcome", "ยินดีต้อนรับ"],
  ["explore", "Explore", "สำรวจบริการ"],
  ["language", "Language", "ภาษา"],
  ["my_request", "My request", "คำขอของฉัน"],
  ["condo", "Condo", "คอนโด"],
  ["rent", "Rent", "เช่า"],
  ["buy", "Buy", "ซื้อ"],
  ["projects", "Projects", "โครงการ"],
  ["bts_living", "BTS living", "ชีวิตใกล้บีทีเอส"],
  ["luxury_homes", "Luxury homes", "บ้านระดับพรีเมียม"],
  ["shortlist", "Shortlist", "รายการที่สนใจ"],
  ["property_detail", "Property detail", "รายละเอียดที่พัก"],
  ["request_viewing", "Request viewing", "ขอนัดชม"],
  ["hotel", "Hotel", "โรงแรม"],
  ["hotel_search", "Hotel search", "สำรวจโรงแรม"],
  ["hotel_detail", "Hotel detail", "รายละเอียดโรงแรม"],
  ["stay_request", "Stay request", "คำขอเข้าพัก"],
  ["airport_transfer", "Airport transfer", "รถรับส่งสนามบิน"],
  ["car_with_driver", "Car with driver", "รถพร้อมคนขับ"],
  ["private_driver", "Private driver", "คนขับส่วนตัว"],
  ["trip_details", "Trip details", "รายละเอียดการเดินทาง"],
  ["pickup_details", "Pickup details", "รายละเอียดจุดรับ"],
  ["bespoke_request", "Bespoke request", "คำขอพิเศษ"],
  ["lifestyle", "Lifestyle", "ไลฟ์สไตล์"],
  ["dining", "Dining", "อาหารและการรับประทาน"],
  ["wellness", "Wellness", "สุขภาวะ"],
  ["local_assistance", "Local assistance", "ความช่วยเหลือในพื้นที่"],
  ["tell_lili", "Tell Lili", "บอกลิลิ"],
  ["lili_reception", "Lili reception", "ลิลิต้อนรับ"],
  ["requirements", "Requirements", "รายละเอียดความต้องการ"],
  ["contact_details", "Contact details", "ข้อมูลติดต่อ"],
  ["consent", "Consent", "ความยินยอม"],
  ["review_request", "Review request", "ตรวจทานคำขอ"],
  ["pending_review", "Pending review", "รอพิจารณา"],
  ["request_status", "Request status", "สถานะคำขอ"],
  ["human_handoff", "Human handoff", "ส่งต่อให้เจ้าหน้าที่"],
  ["help_support", "Help & support", "ความช่วยเหลือ"],
  ["privacy_safety", "Privacy & safety", "ความเป็นส่วนตัวและความปลอดภัย"],
] as const;

const ERROR_COPY = {
  UNAUTHORIZED: [
    "Your session is unavailable. Reload to begin a new sample session.",
    "เซสชันไม่พร้อมใช้งาน โหลดใหม่เพื่อเริ่มเซสชันสมมติ",
  ],
  FORBIDDEN: [
    "This action is not permitted in your sample session.",
    "เซสชันสมมติของคุณไม่สามารถทำรายการนี้ได้",
  ],
  NOT_FOUND: [
    "This sample request is unavailable in your session.",
    "ไม่พบคำขอสมมติในเซสชันของคุณ",
  ],
  VALIDATION_ERROR: [
    "Choose the provided sample values before continuing.",
    "เลือกข้อมูลสมมติที่เตรียมไว้ก่อนดำเนินการต่อ",
  ],
  MOCK_DATA_REQUIRED: [
    "Only literal synthetic-data requests are permitted.",
    "อนุญาตเฉพาะคำขอข้อมูลสมมติที่กำหนดอย่างชัดเจน",
  ],
  INVALID_STATE: [
    "This action is not available in the current request state.",
    "รายการนี้ไม่สามารถทำได้ในสถานะคำขอปัจจุบัน",
  ],
  CONSENT_REQUIRED: [
    "Choose sample consent before continuing.",
    "เลือกความยินยอมตัวอย่างก่อนดำเนินการต่อ",
  ],
  REVISION_CONFLICT: [
    "Your sample request changed. The latest saved details have been refreshed; review them before continuing.",
    "คำขอสมมติเปลี่ยนแปลงแล้ว ระบบโหลดรายละเอียดล่าสุด โปรดตรวจทานก่อนดำเนินการต่อ",
  ],
  IDEMPOTENCY_CONFLICT: [
    "This operation has different details from an earlier attempt. Refresh the request before trying again.",
    "รายการนี้มีรายละเอียดต่างจากครั้งก่อน โปรดโหลดคำขอใหม่ก่อนลองอีกครั้ง",
  ],
  IMAGE_LIMIT: [
    "A maximum of four sample images can be saved.",
    "บันทึกภาพสมมติได้สูงสุดสี่ภาพ",
  ],
  INVALID_ORIGIN: [
    "Open this prototype from its configured local address.",
    "เปิดต้นแบบจากที่อยู่ภายในเครื่องที่กำหนด",
  ],
  CSRF_INVALID: [
    "Your session check expired. Reload before continuing.",
    "การตรวจสอบเซสชันหมดอายุ โปรดโหลดใหม่ก่อนดำเนินการต่อ",
  ],
  INVALID_JSON: [
    "The sample request could not be read.",
    "ไม่สามารถอ่านคำขอสมมติได้",
  ],
  BODY_TOO_LARGE: [
    "The sample request is larger than permitted.",
    "ขนาดคำขอสมมติเกินขีดจำกัด",
  ],
  METHOD_NOT_ALLOWED: [
    "This request action is unavailable.",
    "การทำรายการคำขอนี้ไม่พร้อมใช้งาน",
  ],
  STORAGE_FAILURE: [
    "The local save failed. Retry with the same operation; earlier saved details remain unchanged.",
    "บันทึกภายในเครื่องไม่สำเร็จ ลองใหม่ด้วยรายการเดิม รายละเอียดที่บันทึกก่อนหน้ายังคงเดิม",
  ],
  INTERNAL_ERROR: [
    "The local prototype could not complete this step. Try again.",
    "ต้นแบบภายในเครื่องไม่สามารถทำขั้นตอนนี้ได้ โปรดลองอีกครั้ง",
  ],
  INVALID_PAYLOAD: [
    "Choose only the provided sample details.",
    "เลือกเฉพาะรายละเอียดสมมติที่เตรียมไว้",
  ],
  ORIGIN_DENIED: [
    "Open this prototype from its configured local address.",
    "เปิดต้นแบบจากที่อยู่ภายในเครื่องที่กำหนด",
  ],
  IDEMPOTENCY_REQUIRED: [
    "A request operation identifier is required. Reload before continuing.",
    "ต้องมีรหัสรายการคำขอ โปรดโหลดใหม่ก่อนดำเนินการต่อ",
  ],
  INVALID_TRANSITION: [
    "This action is not available in the current request state.",
    "รายการนี้ไม่สามารถทำได้ในสถานะคำขอปัจจุบัน",
  ],
  DETAILS_REQUIRED: [
    "Save the minimum sample details before continuing.",
    "บันทึกรายละเอียดสมมติขั้นต่ำก่อนดำเนินการต่อ",
  ],
  CONTACT_REQUIRED: [
    "Choose a synthetic contact before review.",
    "เลือกข้อมูลติดต่อสมมติก่อนส่งรอพิจารณา",
  ],
  NOTICE_REQUIRED: [
    "Acknowledge the no-guarantee notice before continuing.",
    "รับทราบข้อชี้แจงเรื่องการไม่รับประกันก่อนดำเนินการต่อ",
  ],
  UNSUPPORTED_MEDIA_TYPE: [
    "This local prototype accepts only its sample request format.",
    "ต้นแบบภายในเครื่องรองรับเฉพาะรูปแบบคำขอสมมติที่กำหนด",
  ],
  STORAGE_UNAVAILABLE: [
    "The local save failed. Retry the same operation; earlier saved details remain unchanged.",
    "บันทึกภายในเครื่องไม่สำเร็จ ลองใหม่ด้วยรายการเดิม รายละเอียดที่บันทึกก่อนหน้ายังคงเดิม",
  ],
} as const;

export const resources: Record<Locale, Record<string, string>> = {
  en: {},
  th: {},
};
for (const [key, values] of Object.entries(COPY)) {
  resources.en[key] = values[0];
  resources.th[key] = values[1];
}
for (const [key, english, thai] of ROUTE_TITLES) {
  resources.en[`routes.${key}.title`] = english;
  resources.th[`routes.${key}.title`] = thai;
}
for (const [key, values] of Object.entries(ERROR_COPY)) {
  resources.en[`error.${key}`] = values[0];
  resources.th[`error.${key}`] = values[1];
}
for (const fixture of DETAIL_PRESETS) {
  const key = fixture.id.endsWith("02")
    ? "request.preset.two"
    : "request.preset.one";
  resources.en[fixture.label_key] = resources.en[key] ?? "";
  resources.th[fixture.label_key] = resources.th[key] ?? "";
}
export const REQUIRED_KEYS = [
  ...Object.keys(COPY),
  ...ROUTE_TITLES.map(([key]) => `routes.${key}.title`),
  ...Object.keys(ERROR_COPY).map((key) => `error.${key}`),
  ...ERROR_CODES.map((code) => `error.${code}`),
  ...ROUTES.map((route) => `routes.${route.content_key}.title`),
  ...REQUEST_STATES.map((state) => `status.${state}`),
  ...CATEGORIES.flatMap((category) => [
    `category.${category}`,
    `category.${category}.description`,
  ]),
  ...CONTACT_FIXTURES.map((fixture) => fixture.display_key),
  ...DETAIL_PRESETS.map((fixture) => fixture.label_key),
  ...IMAGE_FIXTURES.map((fixture) => fixture.label_key),
] as readonly string[];

export function validateLocaleResources(bundles = resources): void {
  const missing = REQUIRED_KEYS.filter((key) => !bundles.en[key]?.trim());
  if (missing.length)
    throw new Error(`Missing English fallback: ${missing.join(", ")}`);
}

export function normaliseLocale(value: unknown): Locale {
  return value === "en" ? "en" : "th";
}

export function resolveLocale(
  value: unknown,
  requiredKeys: readonly string[] = REQUIRED_KEYS,
  bundles = resources,
) {
  validateLocaleResources(bundles);
  const requested = normaliseLocale(value);
  const fallback =
    requested === "th" && requiredKeys.some((key) => !bundles.th[key]?.trim());
  const locale: Locale = fallback ? "en" : requested;
  return {
    locale,
    fallback,
    t(key: string): string {
      const result = bundles[locale][key];
      if (!result?.trim()) throw new Error(`Content unavailable: ${key}`);
      return result;
    },
  };
}
