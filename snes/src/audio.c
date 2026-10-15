#include "game.h"
extern u8 hit_brr,hit_brr_end,shoot_brr,shoot_brr_end;
static brrsamples effects[2];
u8 msuPresent=0;
#define MSU_STATUS (*(vuint8*)0x2000)
#define MSU_TRACKLO (*(vuint8*)0x2004)
#define MSU_TRACKHI (*(vuint8*)0x2005)
#define MSU_VOLUME (*(vuint8*)0x2006)
#define MSU_CONTROL (*(vuint8*)0x2007)
void initAudio(void) {
    u16 timeout=600;
    spcBoot();spcAllocateSoundRegion(40);
    spcSetSoundEntry(6,8,4,(&hit_brr_end-&hit_brr),&hit_brr,&effects[0]);
    spcSetSoundEntry(3,8,4,(&shoot_brr_end-&shoot_brr),&shoot_brr,&effects[1]);
    if((*(vuint8*)0x2002)=='S' && (*(vuint8*)0x2003)=='-' && (*(vuint8*)0x2004)=='M' && (*(vuint8*)0x2005)=='S' && (*(vuint8*)0x2006)=='U' && (*(vuint8*)0x2007)=='1') {
        msuPresent=1;MSU_TRACKLO=1;MSU_TRACKHI=0;
        while((MSU_STATUS&0x40) && timeout)timeout--;
        MSU_VOLUME=120;MSU_CONTROL=3;
    }
}
void audioFrame(void) {spcProcess();}
void playSound(u16 which) {spcPlaySound(which);}
