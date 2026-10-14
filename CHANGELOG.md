# Changelog

## [0.18.0](https://github.com/suneel944/agent-parley/compare/v0.17.0...v0.18.0) (2026-10-05)


### Features

* fold dead lanes and stale problems out of the default view (#996) ([#986](https://github.com/suneel944/agent-parley/issues/986))
* rotate a lane to a fresh native session after each resolved claim (#997) ([#987](https://github.com/suneel944/agent-parley/issues/987))

### Bug fixes

* bound the retire result to the tool budget and count the kept paths (#991) ([#984](https://github.com/suneel944/agent-parley/issues/984))
* keep a claim newer than the forge reading out of the closed footer (#992) ([#985](https://github.com/suneel944/agent-parley/issues/985))
* keep operator-blocked claims through retire and let a retired session keep its tools (#990) ([#982](https://github.com/suneel944/agent-parley/issues/982)) ([#983](https://github.com/suneel944/agent-parley/issues/983))
* offer new forge issues and give each lane a distinct lead (#980) ([#978](https://github.com/suneel944/agent-parley/issues/978)) ([#979](https://github.com/suneel944/agent-parley/issues/979))
* rebind a lane to its live forked session and report an undelivered wake (#998) ([#977](https://github.com/suneel944/agent-parley/issues/977))

### Performance

* list a project's worktrees once instead of once per lane (#995) ([#989](https://github.com/suneel944/agent-parley/issues/989))

## [0.17.0](https://github.com/suneel944/agent-parley/compare/v0.16.0...v0.17.0) (2026-10-03)


### Features

* deliver the 0.17.0 lane autonomy milestone (#975) ([#888](https://github.com/suneel944/agent-parley/issues/888)) ([#894](https://github.com/suneel944/agent-parley/issues/894)) ([#905](https://github.com/suneel944/agent-parley/issues/905)) ([#906](https://github.com/suneel944/agent-parley/issues/906)) ([#907](https://github.com/suneel944/agent-parley/issues/907)) ([#908](https://github.com/suneel944/agent-parley/issues/908)) ([#909](https://github.com/suneel944/agent-parley/issues/909)) ([#910](https://github.com/suneel944/agent-parley/issues/910)) ([#923](https://github.com/suneel944/agent-parley/issues/923)) ([#924](https://github.com/suneel944/agent-parley/issues/924)) ([#925](https://github.com/suneel944/agent-parley/issues/925)) ([#926](https://github.com/suneel944/agent-parley/issues/926)) ([#927](https://github.com/suneel944/agent-parley/issues/927)) ([#928](https://github.com/suneel944/agent-parley/issues/928)) ([#935](https://github.com/suneel944/agent-parley/issues/935)) ([#936](https://github.com/suneel944/agent-parley/issues/936)) ([#937](https://github.com/suneel944/agent-parley/issues/937)) ([#938](https://github.com/suneel944/agent-parley/issues/938)) ([#939](https://github.com/suneel944/agent-parley/issues/939)) ([#940](https://github.com/suneel944/agent-parley/issues/940)) ([#941](https://github.com/suneel944/agent-parley/issues/941)) ([#942](https://github.com/suneel944/agent-parley/issues/942)) ([#964](https://github.com/suneel944/agent-parley/issues/964)) ([#968](https://github.com/suneel944/agent-parley/issues/968)) ([#969](https://github.com/suneel944/agent-parley/issues/969)) ([#973](https://github.com/suneel944/agent-parley/issues/973))

## [0.16.0](https://github.com/suneel944/agent-parley/compare/v0.15.2...v0.16.0) (2026-10-02)


### Bug fixes

* deliver the 0.16.0 audit fixes (#875) ([#782](https://github.com/suneel944/agent-parley/issues/782)) ([#829](https://github.com/suneel944/agent-parley/issues/829)) ([#837](https://github.com/suneel944/agent-parley/issues/837)) ([#838](https://github.com/suneel944/agent-parley/issues/838)) ([#841](https://github.com/suneel944/agent-parley/issues/841)) ([#842](https://github.com/suneel944/agent-parley/issues/842)) ([#843](https://github.com/suneel944/agent-parley/issues/843)) ([#844](https://github.com/suneel944/agent-parley/issues/844)) ([#845](https://github.com/suneel944/agent-parley/issues/845)) ([#846](https://github.com/suneel944/agent-parley/issues/846)) ([#847](https://github.com/suneel944/agent-parley/issues/847)) ([#848](https://github.com/suneel944/agent-parley/issues/848)) ([#849](https://github.com/suneel944/agent-parley/issues/849)) ([#850](https://github.com/suneel944/agent-parley/issues/850)) ([#851](https://github.com/suneel944/agent-parley/issues/851)) ([#852](https://github.com/suneel944/agent-parley/issues/852)) ([#853](https://github.com/suneel944/agent-parley/issues/853)) ([#854](https://github.com/suneel944/agent-parley/issues/854)) ([#855](https://github.com/suneel944/agent-parley/issues/855)) ([#856](https://github.com/suneel944/agent-parley/issues/856)) ([#857](https://github.com/suneel944/agent-parley/issues/857)) ([#858](https://github.com/suneel944/agent-parley/issues/858)) ([#859](https://github.com/suneel944/agent-parley/issues/859)) ([#860](https://github.com/suneel944/agent-parley/issues/860)) ([#861](https://github.com/suneel944/agent-parley/issues/861)) ([#862](https://github.com/suneel944/agent-parley/issues/862)) ([#863](https://github.com/suneel944/agent-parley/issues/863)) ([#882](https://github.com/suneel944/agent-parley/issues/882)) ([#884](https://github.com/suneel944/agent-parley/issues/884))

## [0.15.2](https://github.com/suneel944/agent-parley/compare/v0.15.1...v0.15.2) (2026-10-01)


### Changes

* docs: play the README launch video in the native player (#836)
* docs: show one README video (#835)

## [0.15.1](https://github.com/suneel944/agent-parley/compare/v0.15.0...v0.15.1) (2026-10-01)


### Changes

* fix: steady the wait timing test and lead the README with the launch video (#833)

## [0.15.0](https://github.com/suneel944/agent-parley/compare/v0.14.0...v0.15.0) (2026-10-01)


### Features

* deliver the 0.15.0 autonomy milestone (#828) ([#747](https://github.com/suneel944/agent-parley/issues/747)) ([#748](https://github.com/suneel944/agent-parley/issues/748)) ([#749](https://github.com/suneel944/agent-parley/issues/749)) ([#750](https://github.com/suneel944/agent-parley/issues/750)) ([#751](https://github.com/suneel944/agent-parley/issues/751)) ([#752](https://github.com/suneel944/agent-parley/issues/752)) ([#753](https://github.com/suneel944/agent-parley/issues/753)) ([#754](https://github.com/suneel944/agent-parley/issues/754)) ([#755](https://github.com/suneel944/agent-parley/issues/755)) ([#756](https://github.com/suneel944/agent-parley/issues/756)) ([#757](https://github.com/suneel944/agent-parley/issues/757)) ([#758](https://github.com/suneel944/agent-parley/issues/758)) ([#759](https://github.com/suneel944/agent-parley/issues/759)) ([#760](https://github.com/suneel944/agent-parley/issues/760)) ([#761](https://github.com/suneel944/agent-parley/issues/761)) ([#762](https://github.com/suneel944/agent-parley/issues/762)) ([#776](https://github.com/suneel944/agent-parley/issues/776)) ([#777](https://github.com/suneel944/agent-parley/issues/777)) ([#778](https://github.com/suneel944/agent-parley/issues/778)) ([#779](https://github.com/suneel944/agent-parley/issues/779)) ([#780](https://github.com/suneel944/agent-parley/issues/780)) ([#781](https://github.com/suneel944/agent-parley/issues/781)) ([#783](https://github.com/suneel944/agent-parley/issues/783)) ([#792](https://github.com/suneel944/agent-parley/issues/792)) ([#795](https://github.com/suneel944/agent-parley/issues/795)) ([#796](https://github.com/suneel944/agent-parley/issues/796)) ([#797](https://github.com/suneel944/agent-parley/issues/797)) ([#798](https://github.com/suneel944/agent-parley/issues/798)) ([#799](https://github.com/suneel944/agent-parley/issues/799)) ([#800](https://github.com/suneel944/agent-parley/issues/800)) ([#801](https://github.com/suneel944/agent-parley/issues/801)) ([#803](https://github.com/suneel944/agent-parley/issues/803)) ([#804](https://github.com/suneel944/agent-parley/issues/804)) ([#805](https://github.com/suneel944/agent-parley/issues/805)) ([#806](https://github.com/suneel944/agent-parley/issues/806)) ([#807](https://github.com/suneel944/agent-parley/issues/807)) ([#823](https://github.com/suneel944/agent-parley/issues/823)) ([#824](https://github.com/suneel944/agent-parley/issues/824))

### Bug fixes

* retire released claims on closed issues from free work (#746)

## [0.14.0](https://github.com/suneel944/agent-parley/compare/v0.13.0...v0.14.0) (2026-09-29)


### Features

* deliver the 0.14.0 reliability milestone (#740) ([#581](https://github.com/suneel944/agent-parley/issues/581)) ([#582](https://github.com/suneel944/agent-parley/issues/582)) ([#584](https://github.com/suneel944/agent-parley/issues/584)) ([#591](https://github.com/suneel944/agent-parley/issues/591)) ([#593](https://github.com/suneel944/agent-parley/issues/593)) ([#594](https://github.com/suneel944/agent-parley/issues/594)) ([#595](https://github.com/suneel944/agent-parley/issues/595)) ([#596](https://github.com/suneel944/agent-parley/issues/596)) ([#597](https://github.com/suneel944/agent-parley/issues/597)) ([#598](https://github.com/suneel944/agent-parley/issues/598)) ([#599](https://github.com/suneel944/agent-parley/issues/599)) ([#600](https://github.com/suneel944/agent-parley/issues/600)) ([#601](https://github.com/suneel944/agent-parley/issues/601)) ([#602](https://github.com/suneel944/agent-parley/issues/602)) ([#603](https://github.com/suneel944/agent-parley/issues/603)) ([#604](https://github.com/suneel944/agent-parley/issues/604)) ([#605](https://github.com/suneel944/agent-parley/issues/605)) ([#606](https://github.com/suneel944/agent-parley/issues/606)) ([#607](https://github.com/suneel944/agent-parley/issues/607)) ([#608](https://github.com/suneel944/agent-parley/issues/608)) ([#609](https://github.com/suneel944/agent-parley/issues/609)) ([#610](https://github.com/suneel944/agent-parley/issues/610)) ([#611](https://github.com/suneel944/agent-parley/issues/611)) ([#612](https://github.com/suneel944/agent-parley/issues/612)) ([#613](https://github.com/suneel944/agent-parley/issues/613)) ([#614](https://github.com/suneel944/agent-parley/issues/614)) ([#615](https://github.com/suneel944/agent-parley/issues/615)) ([#616](https://github.com/suneel944/agent-parley/issues/616)) ([#617](https://github.com/suneel944/agent-parley/issues/617)) ([#618](https://github.com/suneel944/agent-parley/issues/618)) ([#619](https://github.com/suneel944/agent-parley/issues/619)) ([#620](https://github.com/suneel944/agent-parley/issues/620)) ([#621](https://github.com/suneel944/agent-parley/issues/621)) ([#622](https://github.com/suneel944/agent-parley/issues/622)) ([#623](https://github.com/suneel944/agent-parley/issues/623)) ([#624](https://github.com/suneel944/agent-parley/issues/624)) ([#625](https://github.com/suneel944/agent-parley/issues/625)) ([#626](https://github.com/suneel944/agent-parley/issues/626)) ([#627](https://github.com/suneel944/agent-parley/issues/627)) ([#628](https://github.com/suneel944/agent-parley/issues/628)) ([#629](https://github.com/suneel944/agent-parley/issues/629)) ([#630](https://github.com/suneel944/agent-parley/issues/630)) ([#631](https://github.com/suneel944/agent-parley/issues/631)) ([#632](https://github.com/suneel944/agent-parley/issues/632)) ([#633](https://github.com/suneel944/agent-parley/issues/633)) ([#634](https://github.com/suneel944/agent-parley/issues/634)) ([#635](https://github.com/suneel944/agent-parley/issues/635)) ([#636](https://github.com/suneel944/agent-parley/issues/636)) ([#637](https://github.com/suneel944/agent-parley/issues/637)) ([#638](https://github.com/suneel944/agent-parley/issues/638)) ([#639](https://github.com/suneel944/agent-parley/issues/639)) ([#640](https://github.com/suneel944/agent-parley/issues/640)) ([#641](https://github.com/suneel944/agent-parley/issues/641)) ([#642](https://github.com/suneel944/agent-parley/issues/642)) ([#643](https://github.com/suneel944/agent-parley/issues/643)) ([#644](https://github.com/suneel944/agent-parley/issues/644)) ([#645](https://github.com/suneel944/agent-parley/issues/645)) ([#646](https://github.com/suneel944/agent-parley/issues/646)) ([#647](https://github.com/suneel944/agent-parley/issues/647)) ([#648](https://github.com/suneel944/agent-parley/issues/648)) ([#649](https://github.com/suneel944/agent-parley/issues/649)) ([#650](https://github.com/suneel944/agent-parley/issues/650)) ([#651](https://github.com/suneel944/agent-parley/issues/651)) ([#652](https://github.com/suneel944/agent-parley/issues/652)) ([#653](https://github.com/suneel944/agent-parley/issues/653)) ([#654](https://github.com/suneel944/agent-parley/issues/654)) ([#655](https://github.com/suneel944/agent-parley/issues/655)) ([#656](https://github.com/suneel944/agent-parley/issues/656)) ([#657](https://github.com/suneel944/agent-parley/issues/657)) ([#658](https://github.com/suneel944/agent-parley/issues/658)) ([#659](https://github.com/suneel944/agent-parley/issues/659)) ([#664](https://github.com/suneel944/agent-parley/issues/664)) ([#665](https://github.com/suneel944/agent-parley/issues/665)) ([#727](https://github.com/suneel944/agent-parley/issues/727)) ([#731](https://github.com/suneel944/agent-parley/issues/731)) ([#734](https://github.com/suneel944/agent-parley/issues/734)) ([#736](https://github.com/suneel944/agent-parley/issues/736)) ([#738](https://github.com/suneel944/agent-parley/issues/738)) ([#741](https://github.com/suneel944/agent-parley/issues/741))

## [0.13.0](https://github.com/suneel944/agent-parley/compare/v0.12.0...v0.13.0) (2026-09-28)


### Features

* deliver the 0.13.0 autonomy milestone (#483, #578) ([#366](https://github.com/suneel944/agent-parley/issues/366)) ([#383](https://github.com/suneel944/agent-parley/issues/383)) ([#384](https://github.com/suneel944/agent-parley/issues/384)) ([#385](https://github.com/suneel944/agent-parley/issues/385)) ([#386](https://github.com/suneel944/agent-parley/issues/386)) ([#387](https://github.com/suneel944/agent-parley/issues/387)) ([#388](https://github.com/suneel944/agent-parley/issues/388)) ([#389](https://github.com/suneel944/agent-parley/issues/389)) ([#390](https://github.com/suneel944/agent-parley/issues/390)) ([#391](https://github.com/suneel944/agent-parley/issues/391)) ([#392](https://github.com/suneel944/agent-parley/issues/392)) ([#393](https://github.com/suneel944/agent-parley/issues/393)) ([#394](https://github.com/suneel944/agent-parley/issues/394)) ([#395](https://github.com/suneel944/agent-parley/issues/395)) ([#396](https://github.com/suneel944/agent-parley/issues/396)) ([#397](https://github.com/suneel944/agent-parley/issues/397)) ([#398](https://github.com/suneel944/agent-parley/issues/398)) ([#399](https://github.com/suneel944/agent-parley/issues/399)) ([#400](https://github.com/suneel944/agent-parley/issues/400)) ([#401](https://github.com/suneel944/agent-parley/issues/401)) ([#402](https://github.com/suneel944/agent-parley/issues/402)) ([#403](https://github.com/suneel944/agent-parley/issues/403)) ([#404](https://github.com/suneel944/agent-parley/issues/404)) ([#405](https://github.com/suneel944/agent-parley/issues/405)) ([#406](https://github.com/suneel944/agent-parley/issues/406)) ([#407](https://github.com/suneel944/agent-parley/issues/407)) ([#408](https://github.com/suneel944/agent-parley/issues/408)) ([#409](https://github.com/suneel944/agent-parley/issues/409)) ([#410](https://github.com/suneel944/agent-parley/issues/410)) ([#411](https://github.com/suneel944/agent-parley/issues/411)) ([#412](https://github.com/suneel944/agent-parley/issues/412)) ([#413](https://github.com/suneel944/agent-parley/issues/413)) ([#414](https://github.com/suneel944/agent-parley/issues/414)) ([#415](https://github.com/suneel944/agent-parley/issues/415)) ([#416](https://github.com/suneel944/agent-parley/issues/416)) ([#417](https://github.com/suneel944/agent-parley/issues/417)) ([#418](https://github.com/suneel944/agent-parley/issues/418)) ([#419](https://github.com/suneel944/agent-parley/issues/419)) ([#420](https://github.com/suneel944/agent-parley/issues/420)) ([#421](https://github.com/suneel944/agent-parley/issues/421)) ([#422](https://github.com/suneel944/agent-parley/issues/422)) ([#423](https://github.com/suneel944/agent-parley/issues/423)) ([#424](https://github.com/suneel944/agent-parley/issues/424)) ([#425](https://github.com/suneel944/agent-parley/issues/425)) ([#439](https://github.com/suneel944/agent-parley/issues/439)) ([#441](https://github.com/suneel944/agent-parley/issues/441)) ([#443](https://github.com/suneel944/agent-parley/issues/443)) ([#444](https://github.com/suneel944/agent-parley/issues/444)) ([#448](https://github.com/suneel944/agent-parley/issues/448)) ([#449](https://github.com/suneel944/agent-parley/issues/449)) ([#450](https://github.com/suneel944/agent-parley/issues/450)) ([#451](https://github.com/suneel944/agent-parley/issues/451)) ([#465](https://github.com/suneel944/agent-parley/issues/465)) ([#474](https://github.com/suneel944/agent-parley/issues/474)) ([#475](https://github.com/suneel944/agent-parley/issues/475)) ([#482](https://github.com/suneel944/agent-parley/issues/482)) ([#485](https://github.com/suneel944/agent-parley/issues/485)) ([#486](https://github.com/suneel944/agent-parley/issues/486)) ([#487](https://github.com/suneel944/agent-parley/issues/487)) ([#488](https://github.com/suneel944/agent-parley/issues/488)) ([#489](https://github.com/suneel944/agent-parley/issues/489)) ([#490](https://github.com/suneel944/agent-parley/issues/490)) ([#492](https://github.com/suneel944/agent-parley/issues/492)) ([#494](https://github.com/suneel944/agent-parley/issues/494)) ([#510](https://github.com/suneel944/agent-parley/issues/510)) ([#516](https://github.com/suneel944/agent-parley/issues/516)) ([#518](https://github.com/suneel944/agent-parley/issues/518)) ([#519](https://github.com/suneel944/agent-parley/issues/519)) ([#532](https://github.com/suneel944/agent-parley/issues/532)) ([#533](https://github.com/suneel944/agent-parley/issues/533)) ([#534](https://github.com/suneel944/agent-parley/issues/534)) ([#541](https://github.com/suneel944/agent-parley/issues/541)) ([#543](https://github.com/suneel944/agent-parley/issues/543)) ([#544](https://github.com/suneel944/agent-parley/issues/544)) ([#545](https://github.com/suneel944/agent-parley/issues/545)) ([#558](https://github.com/suneel944/agent-parley/issues/558)) ([#563](https://github.com/suneel944/agent-parley/issues/563)) ([#564](https://github.com/suneel944/agent-parley/issues/564)) ([#567](https://github.com/suneel944/agent-parley/issues/567)) ([#575](https://github.com/suneel944/agent-parley/issues/575))

### Bug fixes

* refuse native Windows with a WSL2 pointer (#454)

## [0.12.0](https://github.com/suneel944/agent-parley/compare/v0.11.0...v0.12.0) (2026-09-22)


### Features

* close the 0.12.0 autonomy gaps across the coordination loop (#381) ([#349](https://github.com/suneel944/agent-parley/issues/349)) ([#350](https://github.com/suneel944/agent-parley/issues/350)) ([#351](https://github.com/suneel944/agent-parley/issues/351)) ([#353](https://github.com/suneel944/agent-parley/issues/353)) ([#355](https://github.com/suneel944/agent-parley/issues/355)) ([#356](https://github.com/suneel944/agent-parley/issues/356)) ([#358](https://github.com/suneel944/agent-parley/issues/358)) ([#359](https://github.com/suneel944/agent-parley/issues/359)) ([#360](https://github.com/suneel944/agent-parley/issues/360)) ([#361](https://github.com/suneel944/agent-parley/issues/361)) ([#364](https://github.com/suneel944/agent-parley/issues/364)) ([#367](https://github.com/suneel944/agent-parley/issues/367)) ([#370](https://github.com/suneel944/agent-parley/issues/370)) ([#371](https://github.com/suneel944/agent-parley/issues/371)) ([#372](https://github.com/suneel944/agent-parley/issues/372))
* give an observed-complete claim a terminating transition (#380) ([#369](https://github.com/suneel944/agent-parley/issues/369))
* reclaim landed lane worktrees and branches (#375) ([#357](https://github.com/suneel944/agent-parley/issues/357))

### Bug fixes

* derive one lane state every status column reports from (#376) ([#362](https://github.com/suneel944/agent-parley/issues/362))
* group problems rows and prescribe remedies a lane can take (#377) ([#363](https://github.com/suneel944/agent-parley/issues/363))
* keep a lane's client identity across a new session id (#373) ([#352](https://github.com/suneel944/agent-parley/issues/352))
* stop a drifted service before it records the drift (#378) ([#365](https://github.com/suneel944/agent-parley/issues/365))
* time each hook decision and degrade a lane once (#374) ([#354](https://github.com/suneel944/agent-parley/issues/354))
* withdraw an orphan marker when the lane returns (#379) ([#368](https://github.com/suneel944/agent-parley/issues/368))

## [0.11.0](https://github.com/suneel944/agent-parley/compare/v0.10.0...v0.11.0) (2026-09-20)


### Features

* connect authorized work dispatch, verification, and recovery ([#323](https://github.com/suneel944/agent-parley/issues/323)) ([#326](https://github.com/suneel944/agent-parley/issues/326)) ([#327](https://github.com/suneel944/agent-parley/issues/327)) ([#328](https://github.com/suneel944/agent-parley/issues/328)) ([#332](https://github.com/suneel944/agent-parley/issues/332)) ([#333](https://github.com/suneel944/agent-parley/issues/333)) ([#334](https://github.com/suneel944/agent-parley/issues/334)) ([#335](https://github.com/suneel944/agent-parley/issues/335)) ([#336](https://github.com/suneel944/agent-parley/issues/336))

### Bug fixes

* close the 0.11.0 native work loop against live clients (#341) ([#332](https://github.com/suneel944/agent-parley/issues/332)) ([#333](https://github.com/suneel944/agent-parley/issues/333)) ([#335](https://github.com/suneel944/agent-parley/issues/335)) ([#336](https://github.com/suneel944/agent-parley/issues/336)) ([#340](https://github.com/suneel944/agent-parley/issues/340)) ([#342](https://github.com/suneel944/agent-parley/issues/342)) ([#343](https://github.com/suneel944/agent-parley/issues/343)) ([#344](https://github.com/suneel944/agent-parley/issues/344))
* preserve native coordination across launch and recovery (#339) ([#336](https://github.com/suneel944/agent-parley/issues/336))

## [0.10.0](https://github.com/suneel944/agent-parley/compare/v0.9.1...v0.10.0) (2026-09-17)


### Features

* add version, show verbs, --json everywhere and one repo flag (#317) ([#270](https://github.com/suneel944/agent-parley/issues/270))
* close the 0.10.0 milestone across coordination, listing and startup ([#144](https://github.com/suneel944/agent-parley/issues/144)) ([#250](https://github.com/suneel944/agent-parley/issues/250)) ([#252](https://github.com/suneel944/agent-parley/issues/252)) ([#254](https://github.com/suneel944/agent-parley/issues/254)) ([#255](https://github.com/suneel944/agent-parley/issues/255)) ([#263](https://github.com/suneel944/agent-parley/issues/263)) ([#264](https://github.com/suneel944/agent-parley/issues/264)) ([#265](https://github.com/suneel944/agent-parley/issues/265)) ([#267](https://github.com/suneel944/agent-parley/issues/267)) ([#268](https://github.com/suneel944/agent-parley/issues/268)) ([#273](https://github.com/suneel944/agent-parley/issues/273)) ([#274](https://github.com/suneel944/agent-parley/issues/274)) ([#302](https://github.com/suneel944/agent-parley/issues/302))
* deliver coordination to a lane whose CLI raises no hooks (#318) ([#269](https://github.com/suneel944/agent-parley/issues/269))
* keep a project-wide decision log that every lane can search (#316) ([#266](https://github.com/suneel944/agent-parley/issues/266))
* let a lane wait for its next mail over MCP (#319) ([#260](https://github.com/suneel944/agent-parley/issues/260))
* let an operator read the mail of a lane from the main checkout (#321) ([#283](https://github.com/suneel944/agent-parley/issues/283))
* recommend the next issue for a lane with the reason for each place (#320) ([#262](https://github.com/suneel944/agent-parley/issues/262))

### Bug fixes

* reap the launcher a wake starts so the service sheds zombies (#314) ([#301](https://github.com/suneel944/agent-parley/issues/301))
* report no age for a lane that has recorded no activity (#313) ([#312](https://github.com/suneel944/agent-parley/issues/312))

### Performance

* resolve a project directory from a cached root index (#315) ([#303](https://github.com/suneel944/agent-parley/issues/303))

## [0.9.1](https://github.com/suneel944/agent-parley/compare/v0.9.0...v0.9.1) (2026-09-15)


### Bug fixes

* bring the coordination service back after a reboot or a drift exit (#307) ([#298](https://github.com/suneel944/agent-parley/issues/298))
* make the service report its lifecycle and bound a served decision (#308) ([#299](https://github.com/suneel944/agent-parley/issues/299)) ([#300](https://github.com/suneel944/agent-parley/issues/300))
* ship the plugin manifests inside the wheel so doctor reads a protocol (#306) ([#297](https://github.com/suneel944/agent-parley/issues/297))

## [0.9.0](https://github.com/suneel944/agent-parley/compare/v0.8.0...v0.9.0) (2026-09-15)


### Bug fixes

* complete the 0.9.0 stability milestone with a matching command surface and documentation (#291) ([#251](https://github.com/suneel944/agent-parley/issues/251)) ([#253](https://github.com/suneel944/agent-parley/issues/253)) ([#261](https://github.com/suneel944/agent-parley/issues/261)) ([#280](https://github.com/suneel944/agent-parley/issues/280)) ([#281](https://github.com/suneel944/agent-parley/issues/281)) ([#282](https://github.com/suneel944/agent-parley/issues/282)) ([#284](https://github.com/suneel944/agent-parley/issues/284)) ([#285](https://github.com/suneel944/agent-parley/issues/285)) ([#289](https://github.com/suneel944/agent-parley/issues/289))
* fall back in-process when the service answers without a status line (#272) ([#271](https://github.com/suneel944/agent-parley/issues/271))

### Performance

* answer a served hook call from a shell client and start Python only on the fallback path (#278) ([#256](https://github.com/suneel944/agent-parley/issues/256))
* build a status frame from one store connection and one issue snapshot per project (#277) ([#258](https://github.com/suneel944/agent-parley/issues/258))
* import asyncio, curses and the dashboard only on the commands that use them (#275) ([#259](https://github.com/suneel944/agent-parley/issues/259))
* read a lane's branch from the worktree HEAD file instead of a git subprocess (#276) ([#257](https://github.com/suneel944/agent-parley/issues/257))

## [0.8.0](https://github.com/suneel944/agent-parley/compare/v0.7.0...v0.8.0) (2026-09-15)


### Features

* complete the 0.8.0 milestone with WSL checks, a selectable forge, state archives, a served hook client and OpenCode and Amp adapters (#249) ([#142](https://github.com/suneel944/agent-parley/issues/142)) ([#166](https://github.com/suneel944/agent-parley/issues/166)) ([#171](https://github.com/suneel944/agent-parley/issues/171)) ([#172](https://github.com/suneel944/agent-parley/issues/172)) ([#184](https://github.com/suneel944/agent-parley/issues/184)) ([#235](https://github.com/suneel944/agent-parley/issues/235))
* follow one lane's coordination events as a stream (#245) ([#164](https://github.com/suneel944/agent-parley/issues/164))
* forecast a reservation collision from co-change history before a lane starts (#248) ([#233](https://github.com/suneel944/agent-parley/issues/233))
* generate shell completion for commands, participants, providers and issues (#240) ([#163](https://github.com/suneel944/agent-parley/issues/163))
* list every lane, claim and store problem on one triage screen (#246) ([#234](https://github.com/suneel944/agent-parley/issues/234))
* record an advisory token, call and hour budget per lane and mark it when crossed (#244) ([#170](https://github.com/suneel944/agent-parley/issues/170))
* spill an oversized report, message or offer to an attachment and pass a reference (#247) ([#167](https://github.com/suneel944/agent-parley/issues/167))
* warn a lane when an operator edit lands on a path it has reserved (#243) ([#232](https://github.com/suneel944/agent-parley/issues/232))

### Bug fixes

* rotate a lane's durable report log instead of growing it without bound (#237) ([#230](https://github.com/suneel944/agent-parley/issues/230))

### Performance

* cut the lifecycle hook's import cost so every tool call clears faster (#238) ([#229](https://github.com/suneel944/agent-parley/issues/229))

## [0.7.0](https://github.com/suneel944/agent-parley/compare/v0.6.0...v0.7.0) (2026-09-14)


### Features

* deliver an operator message or offer at a time or on a condition (#225) ([#160](https://github.com/suneel944/agent-parley/issues/160))
* export coordination metrics as Prometheus text or JSON (#222) ([#155](https://github.com/suneel944/agent-parley/issues/155))
* fit top to the terminal, page its rows and shape it from the keyboard (#223) ([#151](https://github.com/suneel944/agent-parley/issues/151))
* integrate, select, table and gate lanes as one coordination surface (#239) ([#141](https://github.com/suneel944/agent-parley/issues/141)) ([#158](https://github.com/suneel944/agent-parley/issues/158)) ([#162](https://github.com/suneel944/agent-parley/issues/162)) ([#168](https://github.com/suneel944/agent-parley/issues/168)) ([#169](https://github.com/suneel944/agent-parley/issues/169))
* let the operator offer an issue to a lane with issue assign (#226) ([#165](https://github.com/suneel944/agent-parley/issues/165))
* offer unclaimed and shed-able work to a fit idle lane (#224) ([#145](https://github.com/suneel944/agent-parley/issues/145))

### Bug fixes

* keep the diagnostic path open when coordination fails (#221) ([#213](https://github.com/suneel944/agent-parley/issues/213))
* refuse a store behind the running code in the doctor report (#219) ([#215](https://github.com/suneel944/agent-parley/issues/215))
* report the launcher version of the code that runs (#218) ([#216](https://github.com/suneel944/agent-parley/issues/216))
* retain the cause of a coordination outage past its recovery (#220) ([#217](https://github.com/suneel944/agent-parley/issues/217))

## [0.6.0](https://github.com/suneel944/agent-parley/compare/v0.5.0...v0.6.0) (2026-09-14)


### Features

* apply and show a plan file that records issue order and parallel groups (#207) ([#157](https://github.com/suneel944/agent-parley/issues/157))
* make writing coordination operations retry-safe across CLI and MCP (#206) ([#156](https://github.com/suneel944/agent-parley/issues/156))
* mark a lane idle when it holds unanswered mail and serves no calls (#202) ([#143](https://github.com/suneel944/agent-parley/issues/143))
* measure and show every second a lane spends idle or waiting (#203) ([#147](https://github.com/suneel944/agent-parley/issues/147))
* print every read-only command as JSON for scripts and other agents (#197) ([#150](https://github.com/suneel944/agent-parley/issues/150))
* query the ownership history of an issue, a lane or a claim (#205) ([#154](https://github.com/suneel944/agent-parley/issues/154))
* record a deadline and a retry budget on claims, offers and acknowledgements (#204) ([#152](https://github.com/suneel944/agent-parley/issues/152))
* refuse a mismatched launcher, plugin or store protocol at the boundary (#208) ([#159](https://github.com/suneel944/agent-parley/issues/159)) ([#199](https://github.com/suneel944/agent-parley/issues/199))
* refuse assistant attribution in a lane's branches, commits and pull requests (#198) ([#146](https://github.com/suneel944/agent-parley/issues/146))
* reserve named resources such as ports and databases, not only paths (#201) ([#149](https://github.com/suneel944/agent-parley/issues/149))

## [0.5.0](https://github.com/suneel944/agent-parley/compare/v0.4.0...v0.5.0) (2026-09-14)


### Features

* pause, resume, stop and restart a lane from the base checkout (#196) ([#153](https://github.com/suneel944/agent-parley/issues/153))
* run a recorded initialization command in every new lane before the agent starts (#195) ([#148](https://github.com/suneel944/agent-parley/issues/148))

### Bug fixes

* correlate completion reminders with the current lane pull request (#190) ([#177](https://github.com/suneel944/agent-parley/issues/177))
* include pending handoff offers in the recipient wake backlog (#191) ([#181](https://github.com/suneel944/agent-parley/issues/181))
* preserve successful issue release results when reminders fail (#192) ([#178](https://github.com/suneel944/agent-parley/issues/178))
* preserve the last resumable session after a failed launch (#189) ([#175](https://github.com/suneel944/agent-parley/issues/175))
* refresh recorded evidence when pushing an existing pull request (#193) ([#176](https://github.com/suneel944/agent-parley/issues/176))
* retain first-read and first-acknowledgement timestamps on retries (#187) ([#179](https://github.com/suneel944/agent-parley/issues/179))
* take a consistent event snapshot across log rotation (#194) ([#180](https://github.com/suneel944/agent-parley/issues/180))
* translate Copilot hook payloads before coordination enforcement (#188) ([#173](https://github.com/suneel944/agent-parley/issues/173))

## [0.4.0](https://github.com/suneel944/agent-parley/compare/v0.3.0...v0.4.0) (2026-09-13)

### Features

- Launch native Gemini CLI with a private MCP and hook settings overlay while
  preserving its native authentication and system policy.
  ([#118](https://github.com/suneel944/agent-parley/issues/118))
- Configure PR labels, milestone requirements and body templates per project;
  repositories can accept unlabelled issues.
  ([#115](https://github.com/suneel944/agent-parley/issues/115))
- Include recorded claim-window denials, reservations, conflict counts, gate
  results and an event-export digest when creating a lane's pull request.
  ([#140](https://github.com/suneel944/agent-parley/issues/140))
- Report native-process presence, recent activity and pending acknowledgement
  ages, with advisory reminders for waiting work.
  ([#130](https://github.com/suneel944/agent-parley/issues/130))
- Prompt claim holders when their work is released or a branch PR finishes;
  reminders do not transfer ownership.
  ([#129](https://github.com/suneel944/agent-parley/issues/129))
- Wake an eligible idle terminal or resume a recorded native session to inspect
  pending work. Preserve approval and partial-input guards, provide opt-outs,
  and limit attempts to three per backlog.
  ([#131](https://github.com/suneel944/agent-parley/issues/131))

### Bug fixes

- Protect event-file lifetimes during append, rotation and pruning, recheck
  rotation under the maintenance lock, and clean interrupted prune files.
  Append writers remain concurrent through a shared advisory lock.
  ([#105](https://github.com/suneel944/agent-parley/issues/105))
- Avoid reverse-DNS delays in local server startup and bound SQLite writer
  contention while retaining bounded reads. Add macOS to the CI gate and align
  operating and contributor documentation with the supported behavior.
  ([#119](https://github.com/suneel944/agent-parley/issues/119),
  [#120](https://github.com/suneel944/agent-parley/issues/120),
  [#123](https://github.com/suneel944/agent-parley/issues/123))

### Known limitations

- Copilot's native hook payloads still need translation before coordination
  guards can process them. Native CLI permissions remain separate.
  ([#173](https://github.com/suneel944/agent-parley/issues/173))
- Follow-ups cover failed-resume identity loss, stale evidence on existing PRs,
  reused-branch completion matching, reminder failures after issue release,
  receipt timestamp retries, snapshots during rotation, and waking for offers.
  See the [implementation audit](https://github.com/suneel944/agent-parley/blob/main/docs/releases.md#open-follow-ups-from-the-040-implementation-audit).

## [0.3.0](https://github.com/suneel944/agent-parley/compare/v0.2.0...v0.3.0) (2026-09-13)

### Bug fixes

- Preserve Copilot account settings, other MCP servers and existing hooks
  across launches; name the correct credentials command when a profile is
  missing. ([#108](https://github.com/suneel944/agent-parley/issues/108),
  [#92](https://github.com/suneel944/agent-parley/issues/92))
- Let Git network operations and merges finish without a kill timeout, stream
  verification output, and target the origin repository when creating PRs.
  ([#112](https://github.com/suneel944/agent-parley/issues/112))
- Fit the dashboard to terminal dimensions and retain missing-checkpoint
  warnings. ([#113](https://github.com/suneel944/agent-parley/issues/113))
- Wait briefly for checkpoint and issue locks, allow repeated Stop events after
  branch drift, permit exact renamed-branch repairs, and record inspection
  timeouts through the hook error contract. Apply command guards before
  ignoring child lifecycle state.
  ([#133](https://github.com/suneel944/agent-parley/pull/133),
  [#125](https://github.com/suneel944/agent-parley/issues/125))
- Bound SQLite writer contention, distinguish retryable errors, reconcile FTS5
  indexes and skip busy read telemetry. Commit reservation rebuilds and schema
  versions atomically so interrupted upgrades retain held leases.
  ([#98](https://github.com/suneel944/agent-parley/issues/98),
  [#133](https://github.com/suneel944/agent-parley/pull/133))
- Clean retired participant artifacts, preserve kept branches, exclude
  unreachable recipients, and require registration for lifecycle commands.
  ([#133](https://github.com/suneel944/agent-parley/pull/133))
- Add inbox receipt timestamps and pending-message filters within one response
  budget; validate offsets even for an empty inbox.
  ([#116](https://github.com/suneel944/agent-parley/issues/116))
- Add provider and credential removal, warn on preset overrides, and validate
  credential profiles before creating configuration directories.
  ([#117](https://github.com/suneel944/agent-parley/issues/117))
- Preserve safe Linux shutdown when Python has no pidfd wrappers and verify
  the project on Python 3.12, 3.13 and 3.14.
  ([#124](https://github.com/suneel944/agent-parley/issues/124))

### Documentation

- Explain inherited lane-token exposure and mitigation, document all commands
  and MCP tools, and update the installed coordination skill.
  ([#114](https://github.com/suneel944/agent-parley/issues/114),
  [#121](https://github.com/suneel944/agent-parley/issues/121),
  [#122](https://github.com/suneel944/agent-parley/issues/122))

## [0.2.0](https://github.com/suneel944/agent-parley/compare/v0.1.1...v0.2.0) (2026-09-11)

### Features

- Preview a lane merge and optionally require the repository's verification
  command before performing it.
  ([#60](https://github.com/suneel944/agent-parley/pull/60),
  [#65](https://github.com/suneel944/agent-parley/issues/65))
- Identify and stop lane sessions on macOS.
  ([#67](https://github.com/suneel944/agent-parley/issues/67))
- Open a PR from a lane's recorded report and claimed issues, using the native
  GitHub account. ([#70](https://github.com/suneel944/agent-parley/issues/70))
- Preserve pending work during setup and show claimed issue titles.
  ([#53](https://github.com/suneel944/agent-parley/issues/53),
  [#57](https://github.com/suneel944/agent-parley/issues/57))
- Mark reservations past their declared lifetime as stale without revoking
  them, and display usage already recorded by each native client.
  ([#71](https://github.com/suneel944/agent-parley/issues/71),
  [#73](https://github.com/suneel944/agent-parley/issues/73))
- Send operator messages from the CLI; thread and search a lane's coordination
  mail. ([#72](https://github.com/suneel944/agent-parley/issues/72),
  [#64](https://github.com/suneel944/agent-parley/issues/64))
- Add the Gemini endpoint preset and document other client configuration
  contracts. Native Gemini CLI support arrives later in 0.4.0.
  ([#74](https://github.com/suneel944/agent-parley/issues/74))
- Measure release eligibility from delivered product work.
  ([#63](https://github.com/suneel944/agent-parley/pull/63))

### Bug fixes

- Report a preserved stash by its full object ID so recovery identifies the
  exact entry. ([#80](https://github.com/suneel944/agent-parley/issues/80))

## [0.1.1](https://github.com/suneel944/agent-parley/compare/v0.1.0...v0.1.1) (2026-09-10)

### Documentation

- Add a square listing icon for the plugin directories. This release changes
  listing assets; it does not introduce a new runtime feature.
  ([#34](https://github.com/suneel944/agent-parley/pull/34))

## [0.1.0] - 2026-09-09

### Features

- Introduce separate Git worktrees for native coding-agent sessions on Linux,
  with each session retaining its own vendor authentication.
- Record atomic issue claims, explicit offer-and-accept handoffs and advisory
  dependencies. Timeouts and process exits never move ownership.
- Add advisory file reservations that identify conflicting owners and reasons.
- Provide bounded peer messaging with idempotent sends, paged bodies and
  explicit acknowledgements.
- Deliver coordination updates through lifecycle hooks, guard branch changes
  inside assigned lanes, and retain enforcement events.
- Add `agent-parley status`, the live `agent-parley top` dashboard, and the
  shared `coordinate` skill packaged for Claude Code and Codex.

### Archive status

This version is retained for historical reference. Use the
[latest release](https://github.com/suneel944/agent-parley/releases/latest)
for a current installation.

The 2026-09-10 audit found matching GitHub/PyPI wheels but different source
archives in five documentation, tooling and test files. Runtime package
contents match, and PyPI's source archive matches the original tag. Existing
assets and the tag are preserved; do not retry or rebuild this version.
See the [provenance audit](https://github.com/suneel944/agent-parley/issues/51).
