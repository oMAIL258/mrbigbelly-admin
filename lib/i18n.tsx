'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'th' | 'en';

// Thai is the default here as well: the people working the counter read Thai,
// and the switch is for anyone standing in for them.
const DEFAULT: Lang = 'th';
const KEY = 'mbb-admin-lang';

const TH = {
  // Navigation
  orders: 'ออเดอร์',
  menu: 'เมนู',
  reports: 'รายงาน',
  settings: 'ตั้งค่า',
  signOut: 'ออกจากระบบ',

  // Sign in
  signInBlurb: 'เข้าสู่ระบบเพื่อจัดการออเดอร์',
  email: 'อีเมล',
  password: 'รหัสผ่าน',
  signIn: 'เข้าสู่ระบบ',
  signingIn: 'กำลังเข้าสู่ระบบ…',

  // Order board
  orderBoard: 'กระดานออเดอร์',
  waitingCount: (n: number) => `รอรับ ${n} ออเดอร์`,
  testAlarm: 'ทดสอบเสียงเตือน',
  soundOn: '🔔 เสียงเปิด',
  soundOff: '🔕 เสียงปิด',
  backToToday: 'กลับไปวันนี้',
  loadFailed: 'โหลดออเดอร์ไม่สำเร็จ',
  staleOpen: (n: number) => `มีออเดอร์ของวันก่อน ${n} รายการที่ยังไม่ปิด`,
  staleGo: (day: string) => ` กดเพื่อไปที่ ${day} แล้วปิดให้เรียบร้อย`,
  boardFoot: 'กระดานนี้แสดงทีละวัน ดูปฏิทิน ยอดขาย และของที่ขายได้ที่',
  boardFootLink: 'หน้ารายงาน',
  boardFootTail: '',
  newOrder: 'ออเดอร์ใหม่',
  newOrderCount: (n: number) => `🔔 ${n} ออเดอร์ใหม่`,
  readyIn: (n: number) => `พร้อมในอีก ${n} นาที`,

  // Fulfilment
  pickup: 'รับที่ร้าน',
  delivery: 'ส่งถึงที่',

  // Statuses
  stNew: 'ใหม่',
  stConfirmed: 'กำลังทำ',
  stReady: 'พร้อมแล้ว',
  stDone: 'เสร็จสิ้น',
  stRejected: 'ปฏิเสธแล้ว',

  // Dates
  today: 'วันนี้',
  yesterday: 'เมื่อวาน',

  // Order detail
  notFound: 'ไม่พบออเดอร์นี้',
  back: '← กลับ',
  items: 'รายการอาหาร',
  total: 'รวม',
  fulfilment: 'การรับอาหาร',
  pickupAtShop: 'ลูกค้ามารับที่ร้าน',
  deliverTo: 'ส่งไปที่',
  noDeliveryDetails: '(ไม่มีรายละเอียดการส่ง)',
  lineLinked: 'เชื่อมแล้ว',
  lineAuto: (name: string) => `LINE: ${name} · ระบบแจ้งสถานะให้ลูกค้าอัตโนมัติ`,
  noLineContact: 'ออเดอร์นี้ไม่มี LINE ของลูกค้า จึงแจ้งสถานะให้ไม่ได้ กรุณาโทรหาลูกค้า',
  paymentSlip: 'สลิปโอนเงิน',
  notUploaded: '(ยังไม่ได้อัปโหลด)',

  // Actions
  actions: 'การจัดการ',
  prepMinutes: 'เวลาทำอาหาร (นาที)',
  confirmStart: 'รับออเดอร์ และเริ่มทำ',
  rejectOrder: 'ปฏิเสธออเดอร์…',
  reject: 'ปฏิเสธ',
  markReady: 'อาหารพร้อมแล้ว',
  markDone: 'ลูกค้ารับแล้ว / ส่งแล้ว',
  orderIs: (status: string) => `ออเดอร์นี้: ${status}`,
  notNotified: 'ไม่ได้แจ้งลูกค้าทาง LINE',
  statusSaved: 'สถานะออเดอร์บันทึกเรียบร้อยแล้ว',
  pushFailed: 'ส่งข้อความ LINE ไม่สำเร็จ',
  noLineProfile: 'ออเดอร์นี้ไม่มี LINE ของลูกค้า จึงไม่มีใครให้ส่งข้อความ กรุณาโทรหาลูกค้า',
  lineRefused: (status: number, body: string) => `LINE ปฏิเสธข้อความ (${status}) ${body}`,
  badLogin: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',

  // Reject reasons
  rrPayment: 'ตรวจสอบการชำระเงินไม่ได้',
  rrStock: 'ของหมด',
  rrHours: 'นอกเวลาทำการ',
  rrArea: 'ไม่ได้ส่งในพื้นที่นี้',
  rrOther: 'อื่น ๆ',

  // Reports
  thisWeek: 'สัปดาห์นี้',
  thisMonth: 'เดือนนี้',
  loading: 'กำลังโหลด…',
  orderCount: 'จำนวนออเดอร์',
  revenue: 'ยอดขาย',
  avgOrder: 'ค่าเฉลี่ยต่อออเดอร์',
  deliveryPickup: 'ส่ง / รับที่ร้าน',
  earnedNote: 'นับเฉพาะออเดอร์ที่รับแล้ว ออเดอร์ที่ยังไม่ได้รับและที่ปฏิเสธไม่ถูกนับ',
  noOrdersThatDay: 'วันนั้นไม่มีออเดอร์',
  whatSold: (month: string) => `ของที่ขายได้ใน ${month}`,
  nothingSold: 'เดือนนี้ยังไม่มียอดขาย',
  nOrders: (n: number) => `${n} ออเดอร์`,
  weekdays: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],

  // Settings
  takingOrders: 'การรับออเดอร์',
  takingOrdersNote: 'ปิดสวิตช์นี้เวลาหยุดร้านหรือปิดก่อนเวลา ลูกค้าจะยังเห็นเมนูแต่สั่งไม่ได้จนกว่าจะเปิดอีกครั้ง',
  openTapToClose: 'เปิดรับออเดอร์ — กดเพื่อปิดร้าน',
  closedTapToOpen: 'ปิดร้านอยู่ — กดเพื่อเปิดรับออเดอร์',
  closedMessageLabel: 'ข้อความที่ลูกค้าจะเห็น',
  closedMessageHint: 'ปิดสงกรานต์ กลับมาเปิด 16 เมษายน',
  hours: 'เวลาทำการ',
  openTime: 'เวลาเปิด',
  closeTime: 'เวลาปิด',
  defaultPrep: 'เวลาทำอาหารเริ่มต้น (นาที)',
  save: 'บันทึก',
  saving: 'กำลังบันทึก…',
  saved: 'บันทึกแล้ว',
  whoGetsTold: 'ใครได้รับแจ้งออเดอร์ใหม่',
  whoGetsToldNote: 'คนที่ติ๊กไว้จะได้รับข้อความ LINE ทันทีที่มีออเดอร์เข้า แม้ไม่ได้เปิดหน้ากระดานออเดอร์ไว้ ติ๊กชื่อตัวเองด้วย ชื่อจะขึ้นที่นี่เมื่อมีคนสั่งผ่าน LINE แล้ว',
  nobodyYet: 'ยังไม่มีใครสั่งผ่าน LINE จึงยังไม่มีชื่อให้เลือก',
  lineCustomer: 'ลูกค้า LINE',
  lineMessages: 'ข้อความ LINE',
  checkAgain: 'ตรวจสอบอีกครั้ง',
  checking: 'กำลังตรวจสอบ…',
  checkFailed: 'ตรวจสอบไม่สำเร็จ ลองอีกครั้งในอีกสักครู่',
  liffSet: (id: string) => `ลิงก์ในข้อความจะเปิด LIFF app ${id}`,
  liffMissing: 'ยังไม่ได้ตั้งค่า LINE_LIFF_ID ข้อความที่ส่งจะไม่มีลิงก์กลับไปที่ออเดอร์',
  alertsOn: 'ออเดอร์ใหม่จะแจ้งคนที่ติ๊กไว้ด้านบน',
  alertsNoToken: 'เว็บสั่งอาหารยังไม่มี LINE token จึงแจ้งออเดอร์ใหม่ให้ใครไม่ได้ เพิ่ม LINE_CHANNEL_ACCESS_TOKEN ที่เว็บไซต์ mrbigbelly-order บน Netlify แล้ว redeploy',
  alertsUnreachable: 'ติดต่อเว็บสั่งอาหารเพื่อตรวจสอบไม่ได้',
  withLine: (withIt: number, total: number) =>
    `ออเดอร์ล่าสุด ${total} รายการ มี LINE ของลูกค้า ${withIt} รายการ`,
  noneWithLine: ' จะส่งข้อความให้ใครไม่ได้จนกว่าลูกค้าจะสั่งจากในแอป LINE',
  botConnected: (name: string) => `เชื่อมต่อกับ ${name} แล้ว`,
  tokenMissing: 'เว็บนี้ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN',
  tokenRejected: (status: number, body: string) => `LINE ปฏิเสธ token (${status}) ${body}`,
  lineUnreachable: (msg: string) => `ติดต่อ LINE ไม่ได้: ${msg}`,

  // Menu
  menuNote: 'ใส่รูปให้แต่ละเมนูได้ และปิดเมนูที่ของหมด ค่าเริ่มต้นคือเปิดขายทุกเมนู',
  addPhotoShort: '+ รูป',
  addPhoto: 'เพิ่มรูป',
  replacePhoto: 'เปลี่ยนรูป',
  removePhoto: 'ลบรูป',
  available: 'เปิดขาย',
  soldOut: 'ของหมด',

  // Members
  members: 'สมาชิก',
  rewardsTab: 'ของรางวัล',
  requests: 'คำขอ',
  searchMember: 'ค้นหาชื่อ',
  noMembers: 'ยังไม่มีสมาชิก สมาชิกจะขึ้นที่นี่เมื่อมีคนสั่งผ่าน LINE',
  colPoints: 'แต้ม',
  colOrders: 'ออเดอร์',
  colSpent: 'ยอดซื้อ',
  colLastSeen: 'มาล่าสุด',
  memberSince: (d: string) => `สมาชิกตั้งแต่ ${d}`,
  balance: 'แต้มสะสม',
  adjustPoints: 'ปรับแต้ม',
  addPoints: 'เพิ่มแต้ม',
  removePoints: 'หักแต้ม',
  pointAmount: 'จำนวนแต้ม',
  pointNote: 'เหตุผล (ลูกค้าจะเห็นในข้อความ LINE)',
  applyAdjust: 'ยืนยันและแจ้งลูกค้า',
  pointsHistory: 'ประวัติแต้ม',
  orderHistory: 'ประวัติการสั่ง',
  redemptionHistory: 'ประวัติการใช้สิทธิ์',
  nothingYet: 'ยังไม่มีรายการ',
  notEnoughPoints: 'แต้มของสมาชิกไม่พอสำหรับการหัก',
  keEarn: 'จากการสั่งซื้อ',
  keWelcome: 'แต้มต้อนรับ',
  keRedeem: 'แลกของรางวัล',
  keRefund: 'คืนแต้ม',
  keManual: 'ปรับโดยร้าน',
  keExpire: 'แต้มหมดอายุ',
  subtotal: 'ยอดรวม',
  paid: 'โอนมาแล้ว',
  rewardDiscount: 'ส่วนลดจากแต้ม',
  paidWithPoints: 'จ่ายด้วยส่วนลดทั้งหมด ไม่ต้องมีสลิป',
  freeOrder: 'จ่ายด้วยแต้ม',
  waitingToBeUsed: 'ลูกค้ายังไม่ได้ใช้ จะถูกหักเองเมื่อลูกค้ากดใช้ตอนสั่งครั้งถัดไป',

  // Rewards
  newReward: 'เพิ่มของรางวัล',
  editReward: 'แก้ไขของรางวัล',
  titleTh: 'ชื่อ (ไทย)',
  titleEn: 'ชื่อ (อังกฤษ)',
  detailTh: 'รายละเอียด (ไทย)',
  detailEn: 'รายละเอียด (อังกฤษ)',
  pointsCost: 'ใช้กี่แต้ม',
  stock: 'จำนวนที่มี',
  stockHint: 'เว้นว่าง = ไม่จำกัด',
  activeLabel: 'เปิดให้แลก',
  photo: 'รูปภาพ',
  startsAt: 'เริ่ม',
  endsAt: 'สิ้นสุด',
  deleteReward: 'ลบของรางวัล',
  confirmDelete: 'ลบของรางวัลนี้ใช่ไหม',
  noRewards: 'ยังไม่มีของรางวัล กดเพิ่มของรางวัลเพื่อเริ่ม',
  outOfStock: 'หมดแล้ว',
  nLeft: (n: number) => `เหลือ ${n}`,
  unlimited: 'ไม่จำกัด',
  usePoints: (n: number) => `${n} แต้ม`,
  rewardKind: 'ของรางวัลแบบไหน',
  kindDiscount: 'ส่วนลดเงิน',
  kindThing: 'ของรางวัล',
  kindDiscountNote: 'ลูกค้าแลกแต้มเป็นส่วนลด แล้วกดใช้ตอนสั่งครั้งถัดไป หักจากยอดที่ต้องโอน',
  kindThingNote: 'ลูกค้าแลกแต้มแล้วมารับที่ร้านด้วยรหัส เช่น เครื่องดื่มฟรี',
  discountBaht: 'ส่วนลด (บาท)',
  discountOff: (b: number) => `ลด ฿${b.toLocaleString('en-US')}`,
  perBaht: (b: number) => `฿${b.toLocaleString('en-US')} = 1 แต้ม`,
  needDiscount: 'ใส่จำนวนเงินที่จะลดด้วย',

  // Requests
  pendingTab: 'รออนุมัติ',
  historyTab: 'ประวัติ',
  stPending: 'รออนุมัติ',
  stApproved: 'อนุมัติแล้ว',
  stRejectedR: 'ไม่อนุมัติ',
  stUsed: 'รับของแล้ว',
  approve: 'อนุมัติ',
  rejectRequest: 'ไม่อนุมัติ',
  markUsed: 'ลูกค้ารับของแล้ว',
  reasonOptional: 'เหตุผล (ลูกค้าจะเห็น)',
  noRequests: 'ยังไม่มีคำขอใช้สิทธิ์',
  noPending: 'ไม่มีคำขอรออนุมัติ',
  code: 'รหัส',
  alreadyDecided: 'คำขอนี้ถูกตัดสินไปแล้ว',
  refundedPoints: (n: number) => `คืนแต้มแล้ว ${n} แต้ม`,

  // Points settings
  loyaltyTitle: 'ระบบแต้มสะสม',
  loyaltyNote: 'ลูกค้าได้แต้มทันทีที่ร้านกดรับออเดอร์ เพราะถึงตอนนั้นร้านตรวจสลิปแล้ว',
  spendPerPoint: 'ใช้จ่ายกี่บาทได้ 1 แต้ม',
  welcomePoints: 'แต้มต้อนรับสมาชิกใหม่',
  validMonths: 'แต้มมีอายุ (เดือน)',
  validMonthsHint: '12 = แต้มหมดอายุ 1 ปีหลังได้รับ, 0 = ไม่หมดอายุ',
  validMonthsLocked: 'แต้มที่ลูกค้าได้ไปแล้วยังใช้วันหมดอายุเดิม การแก้ตัวเลขนี้มีผลกับแต้มที่จะได้รับหลังจากนี้เท่านั้น',
  expiredKind: 'แต้มหมดอายุ',
  sweepNow: 'ตัดแต้มที่หมดอายุเดี๋ยวนี้',
  sweepDone: (n: number) => n > 0 ? `ตัดแต้มที่หมดอายุแล้ว ${n} แต้ม` : 'ไม่มีแต้มที่หมดอายุ',
  expiringSoon: (n: number, when: string) => `${n} แต้มจะหมดอายุ ${when}`,
  pointsEnabled: 'เปิดระบบแต้ม',
  bonusPoints: 'แต้มโบนัส',
  bonusHint: 'แต้มพิเศษเมื่อสั่งเมนูนี้ นอกเหนือจากแต้มตามยอดซื้อ',
  newRequestsBadge: (n: number) => `${n} คำขอใหม่`,
};

const EN: typeof TH = {
  orders: 'Orders',
  menu: 'Menu',
  reports: 'Reports',
  settings: 'Settings',
  signOut: 'Sign out',

  signInBlurb: 'Sign in to manage orders.',
  email: 'Email',
  password: 'Password',
  signIn: 'Sign in',
  signingIn: 'Signing in…',

  orderBoard: 'Order board',
  waitingCount: (n) => `${n} waiting`,
  testAlarm: 'Test alarm',
  soundOn: '🔔 Sound on',
  soundOff: '🔕 Sound off',
  backToToday: 'Back to today',
  loadFailed: 'Could not load orders.',
  staleOpen: (n) => `${n} order${n > 1 ? 's' : ''} from earlier days ${n > 1 ? 'are' : 'is'} still open.`,
  staleGo: (day) => ` Tap to go to ${day} and finish up.`,
  boardFoot: 'This board shows one day at a time.',
  boardFootLink: 'Reports',
  boardFootTail: ' has the calendar, takings and what sold.',
  newOrder: 'New order',
  newOrderCount: (n) => `🔔 ${n} NEW ORDER${n > 1 ? 'S' : ''}`,
  readyIn: (n) => `Ready in ${n} min`,

  pickup: 'Pickup',
  delivery: 'Delivery',

  stNew: 'New',
  stConfirmed: 'Preparing',
  stReady: 'Ready',
  stDone: 'Done',
  stRejected: 'Rejected',

  today: 'Today',
  yesterday: 'Yesterday',

  notFound: 'Not found.',
  back: '← Back',
  items: 'Items',
  total: 'Total',
  fulfilment: 'Fulfilment',
  pickupAtShop: 'Pickup at the shop.',
  deliverTo: 'Delivery to',
  noDeliveryDetails: '(no delivery details)',
  lineLinked: 'linked',
  lineAuto: (name) => `LINE: ${name} · status updates are sent automatically`,
  noLineContact: 'No LINE contact for this order, so status updates cannot be sent. Phone the customer instead.',
  paymentSlip: 'Payment slip',
  notUploaded: '(not uploaded)',

  actions: 'Actions',
  prepMinutes: 'Prep time (minutes)',
  confirmStart: 'Confirm & start',
  rejectOrder: 'Reject order…',
  reject: 'Reject',
  markReady: 'Mark ready',
  markDone: 'Mark picked up / delivered',
  orderIs: (status) => `Order ${status}.`,
  notNotified: 'The customer was not notified on LINE.',
  statusSaved: 'The order status itself was saved correctly.',
  pushFailed: 'The LINE message did not send.',
  noLineProfile: 'This order has no LINE profile, so there is nobody to message. Phone the customer instead.',
  lineRefused: (status, body) => `LINE refused the message (${status}). ${body}`,
  badLogin: 'That email and password do not match.',

  rrPayment: 'Payment could not be verified',
  rrStock: 'Out of stock',
  rrHours: 'Outside operating hours',
  rrArea: 'Delivery area not covered',
  rrOther: 'Other',

  thisWeek: 'This week',
  thisMonth: 'This month',
  loading: 'Loading…',
  orderCount: 'Orders',
  revenue: 'Revenue',
  avgOrder: 'Average order',
  deliveryPickup: 'Delivery / pickup',
  earnedNote: 'Counts accepted orders only. Orders still waiting to be confirmed, and rejected ones, are left out.',
  noOrdersThatDay: 'No orders that day.',
  whatSold: (month) => `What sold in ${month}`,
  nothingSold: 'Nothing sold yet this month.',
  nOrders: (n) => `${n} order${n > 1 ? 's' : ''}`,
  weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

  takingOrders: 'Taking orders',
  takingOrdersNote: 'Switch this off for a holiday or when you close early. Customers still see the menu, but cannot place an order until you switch it back on.',
  openTapToClose: 'Open — tap to close the shop',
  closedTapToOpen: 'Closed — tap to reopen',
  closedMessageLabel: 'Message customers see',
  closedMessageHint: 'Closed for Songkran — back on 16 April',
  hours: 'Hours and timing',
  openTime: 'Open',
  closeTime: 'Close',
  defaultPrep: 'Default prep time (minutes)',
  save: 'Save',
  saving: 'Saving…',
  saved: 'Saved.',
  whoGetsTold: 'Who gets told about new orders',
  whoGetsToldNote: 'Anyone ticked here gets a LINE message the moment an order comes in, so you still hear about it with the order board closed. Tick your own name. Names appear here once someone has ordered through LINE.',
  nobodyYet: 'Nobody has ordered through LINE yet, so there is nobody to pick.',
  lineCustomer: 'LINE customer',
  lineMessages: 'LINE messages',
  checkAgain: 'Check again',
  checking: 'Checking…',
  checkFailed: 'The check could not run. Try again in a moment.',
  liffSet: (id) => `Order links point at LIFF app ${id}`,
  liffMissing: 'LINE_LIFF_ID is not set, so messages go out without a link back to the order.',
  alertsOn: 'New orders alert the people ticked above.',
  alertsNoToken: 'The ordering site has no LINE token, so a new order cannot alert anyone. Add LINE_CHANNEL_ACCESS_TOKEN to the mrbigbelly-order site on Netlify and redeploy it.',
  alertsUnreachable: 'Could not reach the ordering site to check whether it can send order alerts.',
  withLine: (withIt, total) => `${withIt} of the last ${total} orders have a LINE contact.`,
  noneWithLine: ' Nobody can be messaged until customers order from inside LINE.',
  botConnected: (name) => `Connected to ${name}.`,
  tokenMissing: 'LINE_CHANNEL_ACCESS_TOKEN is not set on this site.',
  tokenRejected: (status, body) => `LINE rejected the token (${status}). ${body}`,
  lineUnreachable: (msg) => `Could not reach LINE: ${msg}`,

  menuNote: 'Add a photo to any dish, and switch items off when you run out. Everything is on by default.',
  addPhotoShort: '+ Photo',
  addPhoto: 'Add photo',
  replacePhoto: 'Replace photo',
  removePhoto: 'Remove photo',
  available: 'Available',
  soldOut: 'Sold out',

  members: 'Members',
  rewardsTab: 'Rewards',
  requests: 'Requests',
  searchMember: 'Search by name',
  noMembers: 'No members yet. They appear here once someone orders through LINE.',
  colPoints: 'Points',
  colOrders: 'Orders',
  colSpent: 'Spent',
  colLastSeen: 'Last seen',
  memberSince: (d) => `Member since ${d}`,
  balance: 'Points balance',
  adjustPoints: 'Adjust points',
  addPoints: 'Add points',
  removePoints: 'Take points',
  pointAmount: 'How many points',
  pointNote: 'Reason (the customer sees this on LINE)',
  applyAdjust: 'Apply and tell the customer',
  pointsHistory: 'Points history',
  orderHistory: 'Order history',
  redemptionHistory: 'Rewards claimed',
  nothingYet: 'Nothing yet.',
  notEnoughPoints: 'That would take the member below zero.',
  keEarn: 'From an order',
  keWelcome: 'Welcome points',
  keRedeem: 'Reward claimed',
  keRefund: 'Points returned',
  keManual: 'Adjusted by the shop',
  keExpire: 'Expired',
  subtotal: 'Subtotal',
  paid: 'Transferred',
  rewardDiscount: 'Reward discount',
  paidWithPoints: 'Covered in full by a reward discount — no transfer, so there is no slip.',
  freeOrder: 'Paid with points',
  waitingToBeUsed: 'Not used yet. It comes off by itself when the customer taps it on their next order.',

  newReward: 'New reward',
  editReward: 'Edit reward',
  titleTh: 'Name (Thai)',
  titleEn: 'Name (English)',
  detailTh: 'Details (Thai)',
  detailEn: 'Details (English)',
  pointsCost: 'Points to claim',
  stock: 'How many available',
  stockHint: 'Leave empty for unlimited',
  activeLabel: 'Offered to customers',
  photo: 'Photo',
  startsAt: 'From',
  endsAt: 'Until',
  deleteReward: 'Delete reward',
  confirmDelete: 'Delete this reward?',
  noRewards: 'No rewards yet. Add one to get started.',
  outOfStock: 'All gone',
  nLeft: (n) => `${n} left`,
  unlimited: 'Unlimited',
  usePoints: (n) => `${n} points`,
  rewardKind: 'What kind of reward',
  kindDiscount: 'Money off',
  kindThing: 'Something to collect',
  kindDiscountNote: 'They spend points for a discount, then tap it on their next order so it comes off what they transfer.',
  kindThingNote: 'They spend points and collect it at the counter with a code — a free drink, say.',
  discountBaht: 'Discount (baht)',
  discountOff: (b) => `฿${b.toLocaleString('en-US')} off`,
  perBaht: (b) => `฿${b.toLocaleString('en-US')} = 1 point`,
  needDiscount: 'Give the amount it takes off, too.',

  pendingTab: 'Waiting',
  historyTab: 'History',
  stPending: 'Waiting',
  stApproved: 'Approved',
  stRejectedR: 'Not approved',
  stUsed: 'Collected',
  approve: 'Approve',
  rejectRequest: 'Decline',
  markUsed: 'Customer collected it',
  reasonOptional: 'Reason (the customer sees this)',
  noRequests: 'No reward requests yet.',
  noPending: 'Nothing waiting for you.',
  code: 'Code',
  alreadyDecided: 'Someone has already decided this one.',
  refundedPoints: (n) => `${n} points returned`,

  loyaltyTitle: 'Points',
  loyaltyNote: 'Points land the moment you accept an order, since that is when you have checked the slip.',
  spendPerPoint: 'Baht spent per point',
  welcomePoints: 'Welcome points for a new member',
  validMonths: 'Points last (months)',
  validMonthsHint: '12 means a point expires a year after it is earned. 0 means they never expire.',
  validMonthsLocked: 'Points a customer already holds keep the expiry date they were given. Changing this only affects points earned from now on.',
  expiredKind: 'Expired',
  sweepNow: 'Clear expired points now',
  sweepDone: (n) => n > 0 ? `Cleared ${n} expired points.` : 'Nothing had expired.',
  expiringSoon: (n, when) => `${n} points expire ${when}`,
  pointsEnabled: 'Points switched on',
  bonusPoints: 'Bonus points',
  bonusHint: 'Extra points for ordering this dish, on top of what it is worth.',
  newRequestsBadge: (n) => `${n} new request${n > 1 ? 's' : ''}`,
};

const DICT = { th: TH, en: EN };

type Ctx = { lang: Lang; t: typeof TH; setLang: (l: Lang) => void };
const LangContext = createContext<Ctx>({ lang: DEFAULT, t: DICT[DEFAULT], setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT);

  // Read after mount, never during render: the server has no localStorage, and
  // reading it in the initial state would make the markup disagree on hydration.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === 'en' || saved === 'th') setLangState(saved);
    } catch { /* storage blocked */ }
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    try { window.localStorage.setItem(KEY, l); } catch { /* storage blocked */ }
  }

  return (
    <LangContext.Provider value={{ lang, t: DICT[lang], setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

/** The dish name as the kitchen knows it, with the other language under it. */
export function pickName(lang: Lang, en: string, th: string | null | undefined) {
  return lang === 'th' ? (th?.trim() || en) : en;
}

type Status = 'new' | 'confirmed' | 'ready' | 'done' | 'rejected';

/** An order status in words, for a chip or a sentence. */
export function statusLabel(t: typeof TH, status: string) {
  const map: Record<Status, string> = {
    new: t.stNew, confirmed: t.stConfirmed, ready: t.stReady, done: t.stDone, rejected: t.stRejected,
  };
  return map[status as Status] ?? status;
}
