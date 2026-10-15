.include "hdr.asm"
.accu 16
.index 16
.16bit

; 816-tcc ABI: 16-bit arguments at S+4, +6, ...; direct-page r0-r5 are scratch.
; Write complete OAM records; the library NMI transfers them atomically at VBlank.
.section "native_sprite_renderer" superfree
clearSprites:
    ldx #0
    lda #$f000
-   sta.l oamMemory,x
    inx
    inx
    inx
    inx
    cpx #512
    bcc -
    lda #0
-   sta.l oamMemory,x
    inx
    inx
    cpx #544
    bcc -
    rtl

spriteFast:
    lda.l spriteObject
    cmp #512
    bcc +
    rtl
+   tax
    lda 4,s
    clc
    adc #32
    cmp #288
    bcc +
    rtl
+   lda 6,s
    clc
    adc #32
    cmp #256
    bcc +
    rtl
+   sep #$20
    lda 4,s
    sta.l oamMemory,x
    lda 6,s
    sta.l oamMemory+1,x
    lda 8,s
    sta.l oamMemory+2,x
    rep #$20
    lda 10,s
    asl a
    ora #$20
    sta.b tcc__r0
    lda 8,s
    xba
    and #1
    ora.b tcc__r0
    sep #$20
    sta.l oamMemory+3,x
    rep #$20

    txa
    and #12
    lsr a
    tax
    lda #0
    sta.b tcc__r0
    lda 12,s
    beq +
    lda.l largeMasks,x
    sta.b tcc__r0
+   lda 4,s
    and #256
    beq +
    lda.l xMasks,x
    ora.b tcc__r0
    sta.b tcc__r0
+   lda.l spriteObject
    lsr a
    lsr a
    lsr a
    lsr a
    tax
    sep #$20
    lda.l oamMemory+512,x
    ora.b tcc__r0
    sta.l oamMemory+512,x
    rep #$20
    lda.l spriteObject
    clc
    adc #4
    sta.l spriteObject
    rtl
largeMasks: .dw 2,8,32,128
xMasks: .dw 1,4,16,64
.ends

.section "native_beam_renderer" superfree
beamRender:
    lda 4,s
    sta.b tcc__r0
    lda 6,s
    sta.b tcc__r1
    lda 8,s
    sta.b tcc__r2
    lda 10,s
    sta.b tcc__r3
    lda #30
    sta.b tcc__r4
    lda.l spriteObject
    tax
beamLoop:
    lda.b tcc__r0
    clc
    adc.b tcc__r2
    sta.b tcc__r0
    lda.b tcc__r1
    clc
    adc.b tcc__r3
    sta.b tcc__r1
    lda.b tcc__r0
    cmp #1792
    bcc beamNext
    cmp #6400
    bcs beamNext
    lda.b tcc__r1
    cmp #7168
    bcs beamNext
    cpx #512
    bcs beamDone
    lda.b tcc__r0
    lsr a
    lsr a
    lsr a
    lsr a
    lsr a
    sec
    sbc #4
    sep #$20
    sta.l oamMemory,x
    rep #$20
    lda.b tcc__r1
    lsr a
    lsr a
    lsr a
    lsr a
    lsr a
    sec
    sbc #4
    sep #$20
    sta.l oamMemory+1,x
    rep #$20
    lda #$2acd
    sta.l oamMemory+2,x
    inx
    inx
    inx
    inx
beamNext:
    dec.b tcc__r4
    bne beamLoop
beamDone:
    txa
    sta.l spriteObject
    rtl
.ends
