function interp(args)
*--------------------------------------------------------------------------------------
* Clark Evans (evans36-at-uwm-dot-edu), 3 June 2014
* Substantial code chunks provided by the pinterp() script
* of Bob Hart (rhart-at-fsu-dot-edu).
*
* GrADS function to interpolate within a 3-D grid to a specified isosurface.
*
* Input arguments:
*  field     = name of 3-D grid to interpolate (e.g., temperature, wind, RH).
*  interpvar = name of 3-D grid defining the isosurface to interpolate data to
*              (e.g., potential temperature, height, pressure, potential vorticity)
*  pgrid     = Name of 3-D grid containing pressure data in hPa
*              (typically set to 'lev' without quotes)
*  interplev = Level to which to interpolate, in same units as interpvar grid.
*  smooth    = number of times to run field and interpvar through the GrADS
*              smth9() smoother before interpolating (recommend 0 for smooth or
*              continuous data, >>0 for discrete or non-smooth data such as
*              for cases where interpvar is based upon derivatives).
*
* Function returns: Defined 2-D grid containing data (from field) interpolated
*                   to the desired isosurface (given by interplev). This is stored
*                   in a new variable, the name of which is passed as the final argument
*                   when calling this script.
* 
* Example: Interpolate temperature (field = t) to the 1.5 PVU (interplev = 1.5)
*          surface, where interpvar = pv, pgrid = lev, and smooth = 25, and return
*          the result in a variable called temptrop...
*
*          "run interp.gs t pv lev 1.5 25 temptrop"
* [Note: I recommend setting lev to pmax to pmin prior and lev to pmax after this call.]
*
* Note: Areas having interplev below the bottom or above the upper level
*       of available data will be undefined in the output field. No
*       extrapolation is performed on any data.
*
* Note: This script utilizes the GrADS built-in function fndlvl(), which
*       searches from bottom to top. Please keep this code structure in mind
*       when interpreting its output.
*
* Note: interpvar must be on pressure levels and should be present over the
*       entire range of pressure levels found within your data set.
*--------------------------------------------------------------------------------------


* First, determine what we've been given when calling this script...
field=subwrd(args,1)
interpvar=subwrd(args,2)
pgrid=subwrd(args,3)
interplev=subwrd(args,4)
smooth=subwrd(args,5)
outvar=subwrd(args,6)


* Preliminaries: we need the vertical dimensions, both as passed to the script and as
*                found within the data, so we know what we have to work with.
* Get initial dimensions of dataset so that exit dimensions will be same.
"q dims"
rec=sublin(result,4)
ztype=subwrd(rec,3)
if (ztype = "fixed") 
  zmin=subwrd(rec,9)
  zmax=zmin
else
  zmin=subwrd(rec,11)
  zmax=subwrd(rec,13)
endif 

* Get full vertical dimensions of dataset
"q file"
rec=sublin(result,5)
zsize=subwrd(rec,9)
"set z 1 "zsize
"q dims"
rec=sublin(result,4)
pmax=subwrd(rec,6)
pmin=subwrd(rec,8)


* Zeroth course of action: Run the fields through the smoother.
i=1
while(i<=smooth)
  "define "field"=smth9("field")"
  "define "interpvar"=smth9("interpvar")"
  i=i+1
endwhile


* First steps: Find the pressure level of the requested isosurface.
*              To do so, we use the fndlvl() built-in command.
"set z "zmax-1
"define plev=fndlvl("interpvar",const("interpvar","interplev"),lev="pmax",lev="pmin")"


* Next: Interpolate the data to the pressure surface defined by plev.
* This has the effect of interpolating to the desired isosurface given
* by the variable interplev.
* Note: Code below is largely identical to Bob Hart's pinterp(), with only slight
*       modifications made to support spatially-varying (rather than constant)
*       pressure level choices.

* Determine spatially varying bounding pressure levels for p-surface
* pabove = pressure-value at level above ; pbelow = pressure value at level
* below for each gridpoint
"set z 1 "zsize-1
"define pabove=0.5*maskout("pgrid","plev"-"pgrid")+0.5*maskout("pgrid","pgrid"(z-1)-"plev")"

"set z 2 "zsize
"define pbelow=0.5*maskout("pgrid","plev"-"pgrid"(z+1))+0.5*maskout("pgrid","pgrid"-"plev")"

* Isolate field values at bounding pressure levels
* fabove = requested field value above pressure surface
* fbelow = requested field value below pressure surface
"define fabove=pabove*0+"field
"define fbelow=pbelow*0+"field

* Turn this 3-D grid of values (mostly undefined) into a 2-D press layer.
* mean is used here only for simplicity.  
"set z 1"
"define pabove=mean(pabove,z=1,z="zsize")"
"define fabove=mean(fabove,z=1,z="zsize")"
"define pbelow=mean(pbelow,z=1,z="zsize")"
"define fbelow=mean(fbelow,z=1,z="zsize")"

* Finally, interpolate linearly in log-pressure and create surface.
"set z "zmin " " zmax
"define "outvar"=fbelow+log(pbelow/"plev")*(fabove-fbelow)/log(pbelow/pabove)"
say "Done. Newly defined variable contains "interplev" "interpvar"-interpolated "field"."
return(0)