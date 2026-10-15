PVSNESLIB_HOME ?= $(CURDIR)/.tools/pvsneslib
export ROMNAME := PSY2050
export ROMTITLE := PSY2050 CHRONO STORM
export ROMBANKS := 128
export ROMSIZE := 0C
export FASTROM := 1
include $(PVSNESLIB_HOME)/devkitsnes/snes_rules
# Retained compiler intermediates must never be linked a second time as hand-written asm.
SFILES := src/assets.asm src/render.asm
export OFILES := $(CFILES:.c=.obj) $(SFILES:.asm=.obj)
.PHONY: all
.SECONDARY:
all: $(ROMNAME).sfc
