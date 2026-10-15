#include "game.h"
#include <psxspu.h>
#include <psxcd.h>
#include <hwregs_c.h>
extern const u8 sfx_Shoot_01[],sfx_Hit_03[];
extern const u32 sfx_Shoot_01_size,sfx_Hit_03_size;
static u32 soundAddr[2];
static u8 channel;
static volatile u8 musicRestart;
u8 musicAvailable=0;
u16 musicStarts=0;

static void cdReady(CdlIntrResult result,u8 *response) {if(result==CdlDataEnd)musicRestart=1;}
static void musicPlay(void) {u8 track=2;if(CdControl(CdlPlay,&track,0))musicStarts++;}
void initAudio(void) {
    u32 addr=0x1010;
    SpuInit();SpuSetCommonMasterVolume(0x3fff,0x3fff);SpuSetCommonCDVolume(0x2400,0x2400);SPU_CTRL|=1;
    const u8 *data[2]={sfx_Shoot_01,sfx_Hit_03};u32 sizes[2]={sfx_Shoot_01_size,sfx_Hit_03_size};
    for(int i=0;i<2;i++) {
        soundAddr[i]=addr;SpuSetTransferMode(SPU_TRANSFER_BY_DMA);SpuSetTransferStartAddr(addr);SpuWrite((const u32*)data[i],sizes[i]);SpuIsTransferCompleted(SPU_TRANSFER_WAIT);addr+=sizes[i];
    }
    channel=0;musicRestart=0;
    if(CdInit()) {
        CdlLOC toc[100];int tracks=CdGetToc(toc);
        if(tracks>=2){u8 mode=CdlModeDA|CdlModeAP;CdControl(CdlSetmode,&mode,0);CdReadyCallback(cdReady);musicAvailable=1;musicPlay();}
    }
}
void audioFrame(void){
    if(!musicAvailable)return;
    /* Some emulators omit the CD-DA end interrupt; poll the drive as a fallback. */
    if((frame&63)==0){u8 status[8];if(CdControl(CdlNop,0,status) && !(status[0]&(CdlStatPlay|CdlStatSeek)))musicRestart=1;}
    if(musicRestart){musicRestart=0;musicPlay();}
}
void playSound(u16 which) {
    if(which>1)return;
    int ch=channel;channel=(channel+1)%16;
    SpuSetKey(0,1<<ch);SPU_CH_FREQ(ch)=getSPUSampleRate(22050);SPU_CH_ADDR(ch)=getSPUAddr(soundAddr[which]);
    SPU_CH_VOL_L(ch)=which?0x2200:0x1000;SPU_CH_VOL_R(ch)=which?0x2200:0x1000;SPU_CH_ADSR1(ch)=0xff;SPU_CH_ADSR2(ch)=0;SpuSetKey(1,1<<ch);
}
