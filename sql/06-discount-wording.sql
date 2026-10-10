-- Corrects the wording on the four seeded discount rewards.
--
-- They were written when a voucher had to be smaller than the order, which is
-- no longer the rule: a voucher now covers a whole bill (the rest is not kept),
-- and it can be spent at the counter as well as on a website order. Only rows
-- still carrying the original sentence are touched, so anything the shop has
-- reworded is left exactly as it is.
--
-- Nothing here changes the schema, so it can be pasted whenever.

update rewards
   set detail_th = 'ใช้ได้ครั้งเดียว เลือกใช้ตอนสั่งผ่านเว็บ หรือแสดงรหัสใช้กับบิลที่ร้าน ถ้าส่วนลดมากกว่ายอดบิล ส่วนที่เหลือจะไม่ถูกเก็บไว้',
       detail_en = 'Used once — either on a website order or by showing its code in the shop. If it is bigger than the bill, the rest is not kept.'
 where discount_satang is not null
   and detail_th = 'ใช้เป็นส่วนลดในออเดอร์ถัดไป ใช้ได้ 1 ออเดอร์ และยอดสั่งต้องมากกว่าส่วนลด';
