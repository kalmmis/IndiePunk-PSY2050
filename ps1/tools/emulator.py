"""Minimal libretro host for PS1 hardware tests. No BIOS or emulator is redistributed."""
import ctypes as C
from pathlib import Path
from PIL import Image

class GameInfo(C.Structure):
    _fields_=[('path',C.c_char_p),('data',C.c_void_p),('size',C.c_size_t),('meta',C.c_char_p)]

class Emulator:
    B,Y,SELECT,START,UP,DOWN,LEFT,RIGHT,A,X,L,R=range(12)
    def __init__(self,core,rom,symbols):
        rom=Path(rom).resolve()
        self.lib=C.CDLL(str(core));self.buttons=0;self.pixel_format=0;self.last_image=None;self.audio_samples=0;self.audio_peak=0
        self.symbols={}
        for line in Path(symbols).read_text().splitlines():
            pair=line.split()
            if len(pair)==2 and len(pair[0]) in (6,8):
                try:self.symbols[pair[1]]=int(pair[0],16)
                except ValueError:pass
        self._callbacks=[];self._directory=C.c_char_p(b'/tmp')
        self._log=C.CFUNCTYPE(None,C.c_int,C.c_char_p)(lambda level,msg:print('CORE',level,msg.decode(errors='replace'),flush=True) if level>=3 else None)
        def cb(name,result,args,fn):
            value=C.CFUNCTYPE(result,*args)(fn);self._callbacks.append(value);getattr(self.lib,name)(value)
        def environment(cmd,data):
            if cmd==27:C.cast(data,C.POINTER(C.c_void_p))[0]=C.cast(self._log,C.c_void_p);return True
            if cmd in (9,31):C.cast(data,C.POINTER(C.c_char_p))[0]=self._directory;return True
            if cmd==10:self.pixel_format=C.cast(data,C.POINTER(C.c_int))[0];return True
            if cmd==3:C.cast(data,C.POINTER(C.c_bool))[0]=True;return True
            if cmd in (16,18,35):return True
            return False
        def video(data,w,h,pitch):
            if not data:return
            raw=C.string_at(data,pitch*h); pixels=bytearray(w*h*3)
            for yy in range(h):
                for xx in range(w):
                    pos=yy*pitch+xx*2;v=raw[pos]|(raw[pos+1]<<8)
                    if self.pixel_format==2:r=(v>>11)&31;g=(v>>5)&63;b=v&31;g=g*255//63
                    else:r=(v>>10)&31;g=((v>>5)&31)*255//31;b=v&31
                    off=(yy*w+xx)*3;pixels[off:off+3]=bytes((r*255//31,g,b*255//31))
            self.last_image=Image.frombytes('RGB',(w,h),pixels)
        # Avoid copying video for every emulated frame; capture is enabled on demand.
        self._video=video;self.capture=False
        cb('retro_set_environment',C.c_bool,[C.c_uint,C.c_void_p],environment)
        cb('retro_set_video_refresh',None,[C.c_void_p,C.c_uint,C.c_uint,C.c_size_t],lambda *a:video(*a) if self.capture else None)
        def audio(data,frames):
            self.audio_samples+=frames
            if frames:self.audio_peak=max(self.audio_peak,max(abs(data[i])for i in range(0,frames*2,16)))
            return frames
        cb('retro_set_audio_sample',None,[C.c_int16,C.c_int16],lambda l,r:None)
        cb('retro_set_audio_sample_batch',C.c_size_t,[C.POINTER(C.c_int16),C.c_size_t],audio)
        cb('retro_set_input_poll',None,[],lambda:None)
        cb('retro_set_input_state',C.c_int16,[C.c_uint,C.c_uint,C.c_uint,C.c_uint],lambda p,d,i,b:(self.buttons if b==256 else int(bool(self.buttons&(1<<b)))) if p==0 else 0)
        self.lib.retro_init()
        self.lib.retro_load_game.argtypes=[C.POINTER(GameInfo)];self.lib.retro_load_game.restype=C.c_bool
        self.lib.retro_get_memory_data.argtypes=[C.c_uint];self.lib.retro_get_memory_data.restype=C.c_void_p
        self.lib.retro_get_memory_size.argtypes=[C.c_uint];self.lib.retro_get_memory_size.restype=C.c_size_t
        raw=Path(rom).read_bytes();self.rom=C.create_string_buffer(raw)
        info=GameInfo(str(rom).encode(),C.cast(self.rom,C.c_void_p),len(raw),None)
        assert self.lib.retro_load_game(C.byref(info)),'ROM failed to load'
        self.ram=(C.c_uint8*self.lib.retro_get_memory_size(2)).from_address(self.lib.retro_get_memory_data(2))
    def read(self,name,size=2,signed=False):
        addr=self.symbols[name]&(len(self.ram)-1)
        return int.from_bytes(bytes(self.ram[addr:addr+size]),'little',signed=signed)
    def write(self,name,value,size=2):
        addr=self.symbols[name]&(len(self.ram)-1)
        self.ram[addr:addr+size]=int(value).to_bytes(size,'little',signed=value<0)
    def run(self,n,buttons=0):
        self.buttons=buttons
        for _ in range(n):self.lib.retro_run()
    def press(self,button):self.run(12,1<<button);self.run(12)
    def screenshot(self,path):
        self.capture=True;self.run(3,self.buttons);self.capture=False
        self.last_image.resize((self.last_image.width*3,self.last_image.height*3),Image.Resampling.NEAREST).save(path)
    def close(self):self.lib.retro_unload_game();self.lib.retro_deinit()
