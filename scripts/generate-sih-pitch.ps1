<#
Creates an editable SIH pitch deck for Moveup using Microsoft PowerPoint.
The deck deliberately follows the six-slide rhythm of the supplied winning
reference deck, while all product claims are grounded in this repository.
#>

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$outputDirectory = Join-Path $PSScriptRoot "..\deliverables"
$outputPath = Join-Path $outputDirectory "Moveup_SIH26196_Pitch.pptx"
$pdfPath = Join-Path $outputDirectory "Moveup_SIH26196_Pitch.pdf"
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

if (Test-Path -LiteralPath $outputPath) { Remove-Item -LiteralPath $outputPath -Force }
if (Test-Path -LiteralPath $pdfPath) { Remove-Item -LiteralPath $pdfPath -Force }

# PowerPoint / Office constants used below.
$ppLayoutBlank = 12
$ppSaveAsOpenXMLPresentation = 24
$ppSaveAsPDF = 32
$msoTrue = -1
$msoFalse = 0
$msoShapeRectangle = 1
$msoShapeRoundedRectangle = 5
$msoShapeOval = 9
$ppAlignLeft = 1
$ppAlignCenter = 2
$ppAlignRight = 3

# Product palette (derived from app/globals.css).
$navy = [System.Drawing.Color]::FromArgb(15, 28, 50)
$ink = [System.Drawing.Color]::FromArgb(25, 39, 62)
$paper = [System.Drawing.Color]::FromArgb(247, 249, 253)
$white = [System.Drawing.Color]::White
$azure = [System.Drawing.Color]::FromArgb(38, 104, 238)
$azureSoft = [System.Drawing.Color]::FromArgb(227, 236, 255)
$green = [System.Drawing.Color]::FromArgb(23, 145, 103)
$greenSoft = [System.Drawing.Color]::FromArgb(222, 246, 235)
$amber = [System.Drawing.Color]::FromArgb(174, 106, 22)
$amberSoft = [System.Drawing.Color]::FromArgb(255, 241, 215)
$pink = [System.Drawing.Color]::FromArgb(205, 55, 105)
$purple = [System.Drawing.Color]::FromArgb(123, 69, 201)
$muted = [System.Drawing.Color]::FromArgb(92, 108, 132)
$line = [System.Drawing.Color]::FromArgb(220, 227, 238)
$lightText = [System.Drawing.Color]::FromArgb(207, 220, 242)
$minorText = [System.Drawing.Color]::FromArgb(185, 203, 231)
$faintText = [System.Drawing.Color]::FromArgb(138, 161, 196)
$softNavy = [System.Drawing.Color]::FromArgb(34, 51, 80)
$darkRule = [System.Drawing.Color]::FromArgb(63, 84, 116)
$pinkSoft = [System.Drawing.Color]::FromArgb(252, 228, 238)
$purpleSoft = [System.Drawing.Color]::FromArgb(239, 231, 255)
$quietText = [System.Drawing.Color]::FromArgb(133, 148, 170)

function Set-Fill($shape, $color, [int]$transparency = 0) {
  $shape.Fill.Visible = $msoTrue
  $shape.Fill.ForeColor.RGB = $color.ToArgb()
  $shape.Fill.Transparency = $transparency
}

function Set-Line($shape, $color, [double]$weight = 0, [bool]$visible = $false) {
  $shape.Line.Visible = if ($visible) { $msoTrue } else { $msoFalse }
  if ($visible) {
    $shape.Line.ForeColor.RGB = $color.ToArgb()
    $shape.Line.Weight = $weight
  }
}

function Add-Box($slide, [int]$shapeType, [double]$x, [double]$y, [double]$w, [double]$h, $fill, $stroke = $null, [double]$strokeWeight = 0) {
  $shape = $slide.Shapes.AddShape($shapeType, $x, $y, $w, $h)
  Set-Fill $shape $fill
  if ($null -ne $stroke) { Set-Line $shape $stroke $strokeWeight $true } else { Set-Line $shape $fill 0 $false }
  return $shape
}

function Add-Text($slide, [string]$text, [double]$x, [double]$y, [double]$w, [double]$h, [double]$size, $color, [bool]$bold = $false, [int]$align = 1, [string]$font = "Aptos") {
  $shape = $slide.Shapes.AddTextbox(1, $x, $y, $w, $h)
  $shape.TextFrame.MarginLeft = 0
  $shape.TextFrame.MarginRight = 0
  $shape.TextFrame.MarginTop = 0
  $shape.TextFrame.MarginBottom = 0
  $shape.TextFrame.WordWrap = $msoTrue
  $shape.TextFrame.TextRange.Text = $text
  $range = $shape.TextFrame.TextRange
  $range.Font.Name = $font
  $range.Font.Size = $size
  $range.Font.Bold = if ($bold) { $msoTrue } else { $msoFalse }
  $range.Font.Color.RGB = $color.ToArgb()
  $range.ParagraphFormat.Alignment = $align
  return $shape
}

function Add-Pill($slide, [string]$text, [double]$x, [double]$y, [double]$w, $fill, $color) {
  $pill = Add-Box $slide $msoShapeRoundedRectangle $x $y $w 23 $fill
  $pill.Adjustments.Item(1) = 0.25
  Add-Text $slide $text ($x + 10) ($y + 5) ($w - 20) 15 9.5 $color $true $ppAlignCenter | Out-Null
}

function Add-Header($slide, [string]$section, [int]$number, [bool]$dark = $false) {
  $titleColor = if ($dark) { $white } else { $ink }
  $minorColor = if ($dark) { $minorText } else { $muted }
  Add-Text $slide "MOVEUP" 44 28 110 16 10 $azure $true $ppAlignLeft "Aptos Display" | Out-Null
  Add-Text $slide $section.ToUpper() 44 52 500 14 10 $minorColor $true $ppAlignLeft | Out-Null
  Add-Text $slide ("0{0}" -f $number) 884 28 32 16 10 $minorColor $true $ppAlignRight | Out-Null
  $rule = $slide.Shapes.AddLine(44, 76, 916, 76)
  $ruleColor = if ($dark) { $darkRule } else { $line }
  Set-Line $rule $ruleColor 1 $true
}

function Add-FeatureCard($slide, [string]$icon, [string]$title, [string]$body, [double]$x, [double]$y, [double]$w, [double]$h, $accent, $soft) {
  $card = Add-Box $slide $msoShapeRoundedRectangle $x $y $w $h $white $line 0.75
  $card.Adjustments.Item(1) = 0.12
  $tile = Add-Box $slide $msoShapeRoundedRectangle ($x + 18) ($y + 17) 33 33 $soft
  $tile.Adjustments.Item(1) = 0.2
  Add-Text $slide $icon ($x + 18) ($y + 22) 33 22 14 $accent $true $ppAlignCenter "Segoe UI Symbol" | Out-Null
  Add-Text $slide $title ($x + 62) ($y + 19) ($w - 80) 20 14 $ink $true | Out-Null
  Add-Text $slide $body ($x + 18) ($y + 61) ($w - 36) ($h - 76) 10.5 $muted $false | Out-Null
}

$powerPoint = $null
$presentation = $null
try {
  $powerPoint = New-Object -ComObject PowerPoint.Application
  $powerPoint.Visible = $msoTrue
  $presentation = $powerPoint.Presentations.Add()
  $presentation.PageSetup.SlideSize = 15 # Widescreen 16:9

  # Slide 1  title
  $slide = $presentation.Slides.Add(1, $ppLayoutBlank)
  $slide.FollowMasterBackground = $msoFalse
  $slide.Background.Fill.ForeColor.RGB = $navy.ToArgb()
  Add-Box $slide $msoShapeOval 575 94 380 380 $azure  | Out-Null
  $slide.Shapes.Item($slide.Shapes.Count).Fill.Transparency = 0.75
  Add-Box $slide $msoShapeOval 658 176 218 218 $green | Out-Null
  $slide.Shapes.Item($slide.Shapes.Count).Fill.Transparency = 0.78
  Add-Box $slide $msoShapeOval 723 242 88 88 $white | Out-Null
  $slide.Shapes.Item($slide.Shapes.Count).Fill.Transparency = 0.82
  Add-Pill $slide "SMART INDIA HACKATHON 2026" 45 46 192 $azure $white
  Add-Text $slide "Moveup" 45 143 490 58 43 $white $true $ppAlignLeft "Aptos Display" | Out-Null
  Add-Text $slide "Fitness that fits student life." 47 208 465 38 22 $lightText $false | Out-Null
  Add-Text $slide "A campus fitness PWA that finds the right time, place and people for students to move." 47 275 430 60 16 $white $false | Out-Null
  Add-Pill $slide "Problem ID 26196" 47 367 116 $softNavy $white
  Add-Pill $slide "Fitness and Sports" 175 367 122 $softNavy $white
  Add-Text $slide "Student Innovation  ideas that boost fitness activities and help students stay fit" 47 447 480 33 12 $minorText $false | Out-Null
  Add-Text $slide "Team name / Team ID: add before submission" 47 502 360 16 10 $faintText $false | Out-Null
  Add-Text $slide "01" 885 505 30 16 10 $minorText $true $ppAlignRight | Out-Null

  # Slide 2  problem and distinct solution
  $slide = $presentation.Slides.Add(2, $ppLayoutBlank)
  $slide.Background.Fill.ForeColor.RGB = $paper.ToArgb()
  Add-Header $slide "Problem & differentiated solution" 2
  Add-Text $slide "Students do not need another generic workout plan." 44 100 660 32 25 $ink $true | Out-Null
  Add-Text $slide "They need fitness that works inside a real campus day." 44 133 600 23 15 $muted $false | Out-Null
  Add-Text $slide "THE FRICTION" 44 184 260 16 10 $pink $true | Out-Null
  Add-Text $slide "THE MOVEUP RESPONSE" 500 184 340 16 10 $azure $true | Out-Null
  Add-FeatureCard $slide "1" "Timetable gaps disappear" "Short free slots are rarely turned into a clear, realistic activity plan." 44 214 398 106 $pink $pinkSoft
  Add-FeatureCard $slide "2" "Unsafe / uncertain conditions" "Heat, rain and air quality make the best time and place hard to judge." 44 337 398 106 $amber $amberSoft
  Add-FeatureCard $slide "3" "Motivation needs people" "Fitness alone loses momentum; typed activity data is difficult to trust." 44 460 398 106 $purple $purpleSoft
  Add-FeatureCard $slide "A" "Fit Window + Smart Quest" "Matches timetable, goals, duration and weather/AQI to a practical next move." 500 214 416 106 $azure $azureSoft
  Add-FeatureCard $slide "B" "FitRoute" "Shows weather-aware campus activity spots, green windows and indoor alternatives." 500 337 416 106 $green $greenSoft
  Add-FeatureCard $slide "C" "Fit Circles + Squad Sessions" "Turns movement social with challenges, live boards and peer-verified group activity." 500 460 416 106 $purple $purpleSoft

  # Slide 3  system architecture
  $slide = $presentation.Slides.Add(3, $ppLayoutBlank)
  $slide.Background.Fill.ForeColor.RGB = $paper.ToArgb()
  Add-Header $slide "System architecture" 3
  Add-Text $slide "From a student's available moment to a trusted fitness action." 44 99 760 30 23 $ink $true | Out-Null
  Add-Text $slide "Personalised selection is rule-based; AI can enrich quest wording but never decides eligibility." 44 135 780 21 12 $muted $false | Out-Null
  Add-Text $slide "CONTEXT" 63 191 150 14 10 $muted $true | Out-Null
  Add-Text $slide "DECISION" 382 191 150 14 10 $muted $true | Out-Null
  Add-Text $slide "ACTION" 687 191 150 14 10 $muted $true | Out-Null
  $left = Add-Box $slide $msoShapeRoundedRectangle 44 215 230 212 $white $line 0.75; $left.Adjustments.Item(1) = 0.1
  Add-Text $slide "Student context" 64 237 160 20 15 $ink $true | Out-Null
  Add-Text $slide " Timetable & free slots`n Fitness goal & level`n Preferred activity / duration`n Circle availability`n Weather & AQI`n Campus locations" 64 273 180 122 11 $muted $false | Out-Null
  $center = Add-Box $slide $msoShapeRoundedRectangle 352 215 260 212 $navy; $center.Adjustments.Item(1) = 0.1
  Add-Text $slide "Moveup decision layer" 374 238 215 20 15 $white $true | Out-Null
  Add-Text $slide "Fit Window Engine`nFinds the strongest available slot.`n`nSmart Quest Planner`nSelects a realistic next activity." 374 278 203 110 12 $lightText $false | Out-Null
  $right = Add-Box $slide $msoShapeRoundedRectangle 690 215 226 212 $white $line 0.75; $right.Adjustments.Item(1) = 0.1
  Add-Text $slide "Student action" 711 237 160 20 15 $ink $true | Out-Null
  Add-Text $slide " Start a quest`n Choose a FitRoute spot`n Join a circle challenge`n Track a GPS session`n Start a Squad Session" 711 273 170 118 11 $muted $false | Out-Null
  $arrow1 = $slide.Shapes.AddLine(284, 321, 342, 321); Set-Line $arrow1 $azure 2.3 $true
  $arrow2 = $slide.Shapes.AddLine(622, 321, 680, 321); Set-Line $arrow2 $azure 2.3 $true
  Add-Pill $slide "Trust layer: source weighting  GPS plausibility checks  peer verification" 161 469 634 $greenSoft $green
  Add-Text $slide "Next.js + TypeScript    Supabase Auth / Postgres / Realtime / Storage    MapLibre + OpenStreetMap    Open-Meteo    PWA" 44 539 870 16 10 $muted $false $ppAlignCenter | Out-Null

  # Slide 4  hard questions
  $slide = $presentation.Slides.Add(4, $ppLayoutBlank)
  $slide.Background.Fill.ForeColor.RGB = $navy.ToArgb()
  Add-Header $slide "Potential challenges  and our answer" 4 $true
  Add-Text $slide "Designed for a credible campus pilot, not a feature wish-list." 44 105 760 30 24 $white $true | Out-Null
  Add-FeatureCard $slide "01" "Can activity be faked?" "We distinguish manual, quest, GPS and squad sources. GPS sessions reject implausible pace; co-located squads earn peer-verified status." 44 178 414 146 $green $greenSoft
  Add-FeatureCard $slide "02" "Does AI make opaque decisions?" "No. Quest choice stays with transparent, testable rules. Gemini is optional and only writes personal quest content." 501 178 414 146 $azure $azureSoft
  Add-FeatureCard $slide "03" "What about data and privacy?" "No wearable is required. RLS scopes student data; coordinators receive anonymised aggregate statistics, not individual surveillance." 44 355 414 146 $purple $purpleSoft
  Add-FeatureCard $slide "04" "Will it work on a student phone?" "Installable PWA, offline cache, OpenStreetMap and Open-Meteo keep the core experience lightweight and low-cost." 501 355 414 146 $amber $amberSoft
  Add-Text $slide "Honest boundary: peer verification raises the cost of cheating; it does not claim to eliminate collusion." 44 538 870 16 10 $minorText $false $ppAlignCenter | Out-Null

  # Slide 5  prototype and demo
  $slide = $presentation.Slides.Add(5, $ppLayoutBlank)
  $slide.Background.Fill.ForeColor.RGB = $paper.ToArgb()
  Add-Header $slide "Prototype, demo and roadmap" 5
  Add-Text $slide "A complete product flow that can be demonstrated on two devices." 44 100 760 30 23 $ink $true | Out-Null
  Add-Text $slide "DEMO FLOW" 44 159 170 14 10 $azure $true | Out-Null
  $steps = @(
    @{ N = "1"; T = "Onboard"; B = "Goal, fitness level, preferences and free timetable slots."; C = $azure; S = $azureSoft },
    @{ N = "2"; T = "Discover"; B = "Fit Window suggests the right activity and FitRoute suggests the place."; C = $green; S = $greenSoft },
    @{ N = "3"; T = "Move together"; B = "Join a Fit Circle or start a shared GPS-based Squad Session."; C = $purple; S = $purpleSoft },
    @{ N = "4"; T = "Prove progress"; B = "Live board completes the session; server labels peer-verified activity."; C = $pink; S = $pinkSoft }
  )
  $sx = 44
  foreach ($step in $steps) {
    $card = Add-Box $slide $msoShapeRoundedRectangle $sx 192 202 184 $white $line 0.75; $card.Adjustments.Item(1) = 0.1
    $bubble = Add-Box $slide $msoShapeOval ($sx + 18) 211 33 33 $step.S
    Add-Text $slide $step.N ($sx + 18) 218 33 14 11 $step.C $true $ppAlignCenter | Out-Null
    Add-Text $slide $step.T ($sx + 18) 260 158 20 14 $ink $true | Out-Null
    Add-Text $slide $step.B ($sx + 18) 293 164 63 10.2 $muted $false | Out-Null
    $sx += 218
  }
  Add-Text $slide "DELIVERED IN THE PROTOTYPE" 44 424 250 14 10 $green $true | Out-Null
  Add-Pill $slide "Smart Quest Planner" 44 452 136 $azureSoft $azure
  Add-Pill $slide "FitRoute + Green Window" 193 452 164 $greenSoft $green
  Add-Pill $slide "Fit Circles and Leaderboards" 370 452 173 $purpleSoft $purple
  Add-Pill $slide "Live Squad Sessions" 556 452 136 $pinkSoft $pink
  Add-Pill $slide "Coordinator dashboard" 705 452 153 $amberSoft $amber
  Add-Text $slide "NEXT: campus pilot  accessibility / local-language refinement  opt-in Health Connect as an additional, clearly labelled activity source" 44 526 870 17 10.5 $muted $false $ppAlignCenter | Out-Null
  Add-Text $slide "Before submission: replace the placeholder below with your live prototype and repository URL." 44 555 870 14 9.5 $quietText $false $ppAlignCenter | Out-Null

  # Slide 6  benefits and sources
  $slide = $presentation.Slides.Add(6, $ppLayoutBlank)
  $slide.Background.Fill.ForeColor.RGB = $paper.ToArgb()
  Add-Header $slide "Social benefit & references" 6
  Add-Text $slide "A healthier campus begins with a fitness choice students can actually make today." 44 100 785 32 23 $ink $true | Out-Null
  Add-FeatureCard $slide "01" "Less decision friction" "A specific next action is easier to start than a vague instruction to exercise more." 44 166 203 174 $azure $azureSoft
  Add-FeatureCard $slide "02" "Safer choices" "Students can favour green weather/AQI windows and campus spots with relevant conditions." 267 166 203 174 $green $greenSoft
  Add-FeatureCard $slide "03" "Social accountability" "Circles, challenges and Squad Sessions make progress a shared campus experience." 490 166 203 174 $purple $purpleSoft
  Add-FeatureCard $slide "04" "Responsible coordination" "Aggregate-only views give campus coordinators useful signals while protecting personal data." 713 166 203 174 $amber $amberSoft
  $reference = Add-Box $slide $msoShapeRoundedRectangle 44 394 872 126 $white $line 0.75; $reference.Adjustments.Item(1) = 0.08
  Add-Text $slide "PRODUCT & RESEARCH BASIS" 65 417 300 14 10 $azure $true | Out-Null
  Add-Text $slide " Smart India Hackathon Problem Statement 26196  Student Innovation: ideas to boost fitness activities and assist in keeping fit`n Open-Meteo  weather and air-quality context; OpenStreetMap  campus activity-place discovery`n Moveup technical implementation: Next.js, Supabase, MapLibre and PWA architecture" 65 447 790 55 10.5 $muted $false | Out-Null
  Add-Text $slide "Moveup  fitness that fits student life." 44 548 872 18 13 $azure $true $ppAlignCenter "Aptos Display" | Out-Null

  $presentation.SaveAs($outputPath, $ppSaveAsOpenXMLPresentation)
  $presentation.SaveAs($pdfPath, $ppSaveAsPDF)
}
finally {
  if ($null -ne $presentation) { $presentation.Close() }
  if ($null -ne $powerPoint) { $powerPoint.Quit() }
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint)
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

Write-Output "Created: $outputPath"
Write-Output "Created: $pdfPath"
