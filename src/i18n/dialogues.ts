import { getLanguage } from './index';

// Normalization helper for dictionary matching
function normalizeKey(str: string): string {
  return str.replace(/\r\n/g, '\n').trim();
}

const DIALOGUES_PT_BR: Record<string, string> = {
  // Dagobah Intro & Landing
  "Dagobah! Yoda must be around here somewhere. I better find him and see what's on his mind...":
    "Dagobah! Yoda deve estar por aqui em algum lugar. É melhor encontrá-lo e ver o que ele quer...",
  "Wait, I hear Yoda calling...":
    "Espere, estou ouvindo Yoda me chamar...",

  // Artoo (R2-D2)
  "Artoo! What are you doing here?":
    "Artoo! O que você está fazendo aqui?",
  "Wheeoo... bzzt...  I'm here to HELP! Take me along, then drop me on anything you find confusing, and I'll give you some hints!":
    "Wheeoo... bzzt... Estou aqui para AJUDAR! Leve-me com você, e me solte em qualquer coisa que ache confusa para eu lhe dar dicas!",
  "Come on, Artoo...":
    "Venha, Artoo...",

  // Yoda Encounters & Quests on Dagobah
  "Master Yoda! The weirdest thing just happened...":
    "Mestre Yoda! A coisa mais estranha acabou de acontecer...",
  "Mmm. Equipped like a true Jedi are you now!":
    "Mmm. Equipado como um verdadeiro Jedi você está agora!",
  "Found the sapphire, mmm? Jedi you must be!":
    "Encontrou a safira, mmm? Um Jedi você deve ser!",
  "Found the dianoga heart I see. From it, a SPIRIT HEART will I make for you...":
    "Encontrou o coração de dianoga, eu vejo. Com ele, um CORAÇÃO ESPIRITUAL farei para você...",
  "Now death will keep a more respectful distance, mmm?":
    "Agora a morte manterá uma distância mais respeitosa, mmm?",
  "I'm waiting. Where's my bug?":
    "Estou esperando. Onde está o meu inseto?",
  "I'm hungry. Find me a bug.":
    "Estou com fome. Encontre um inseto para mim.",
  "Mmm... good!":
    "Mmm... muito bom!",
  "Into the trees, Luke!":
    "Para dentro das árvores, Luke!",
  "Mmm... there you are! Important new mission do I have for you...\n\nBut first... into the trees must you go... to meet someone you should know better!":
    "Mmm... aí está você! Uma nova e importante missão tenho para você...\n\nMas antes... para dentro das árvores você deve ir... conhecer alguém que deveria conhecer melhor!",
  "Into the swamp, Luke! Bring me a DIANOGA HEART!":
    "Para dentro do pântano, Luke! Traga-me um CORAÇÃO DE DIANOGA!",
  "Mmm... persistent you have become, Luke... but reckless are you still!\n\nHungry death knows this, and follows you closely, expecting to be fed very soon, yes!\n\nSo! Before we discuss your training further, into the swamp you must go... a DIANOGA HEART you must bring to me!":
    "Mmm... persistente você se tornou, Luke... mas imprudente você ainda é!\n\nA morte faminta sabe disso e o segue de perto, esperando ser alimentada em breve, sim!\n\nEntão! Antes de conversarmos mais sobre seu treinamento, para o pântano você deve ir... um CORAÇÃO DE DIANOGA deve trazer para mim!",
  "Trust your feelings! Find the jewel!":
    "Confie em seus sentimentos! Encontre a joia!",
  "Luke! Much have you trained. Jedi are you yet?\n\nMaybe. Maybe not. Into the CAVE you must now go... find a STAR SAPPHIRE you may.":
    "Luke! Muito você treinou. Um Jedi você já é?\n\nTalvez. Talvez não. Para dentro da CAVERNA você deve ir agora... encontrar uma SAFIRA ESTELAR você pode.",
  "What cave? What are you talking about?":
    "Que caverna? Do que você está falando?",

  // Boba Fett & Kidnapping
  "This is Boba Fett's ship! Now what's he doing here...?":
    "Esta é a nave de Boba Fett! O que ele está fazendo aqui...?",
  "Wait...!":
    "Espere...!",
  "You can't take Yoda! Bring him back!":
    "Você não pode levar o Yoda! Traga-o de volta!",
  "Boba Fett! Where did you come from???":
    "Boba Fett! De onde você surgiu???",
  "Ha! We've taken your Master!\n\nToo bad... I guess your training is finished...":
    "Ha! Capturamos o seu Mestre!\n\nQue pena... acho que seu treinamento acabou...",
  "I don't believe it! No one can kidnap Yoda! But even if it is true, I'll bet he left me a sign...":
    "Eu não acredito! Ninguém pode sequestrar o Yoda! Mas mesmo que seja verdade, aposto que ele me deixou uma pista...",

  // Return to Dagobah / End-game
  "We're back, Master!":
    "Estamos de volta, Mestre!",
  "It's nice to be home.":
    "É bom estar em casa.",
  "Well done, Luke! Taken another step you have... \n\n...along the path that never ends!":
    "Muito bem, Luke! Mais um passo você deu...\n\n...ao longo do caminho que nunca termina!",
  "Threepio, back together again! He may yet prove worthy in our struggle.":
    "C-3PO, montado novamente! Ele ainda pode ser útil em nossa luta.",
  "Faithful Threepio! Almost a god to the Ewoks, mmm?":
    "Fiel C-3PO! Quase um deus para os Ewoks, mmm?",
  "Good... your sister is safe! That's right... sister! You DID know that, mmm?":
    "Ótimo... sua irmã está a salvo! Isso mesmo... irmã! Você SABIA disso, mmm?",
  "The Imperial Code! Admiral Akbar will be pleased!":
    "O Código Imperial! O Almirante Ackbar ficará satisfeito!",
  "The Sith Amulet! Found at last. Leave this charm with me... dispose of it before harm comes, I will.":
    "O Amuleto Sith! Encontrado finalmente. Deixe este amuleto comigo... vou me livrar dele antes que cause danos.",
  "Mmm, you found the crystal! Now the Empire is weaker!":
    "Mmm, você encontrou o cristal! Agora o Império está mais fraco!",
  "Good work, Luke! With Marutz safe, the Rebel strategy is secure!":
    "Bom trabalho, Luke! Com Marutz a salvo, a estratégia Rebelde está segura!",
  "The Cloaking Device! Now the Empire's dark intentions cannot be concealed!":
    "O Dispositivo de Camuflagem! Agora as intenções sombrias do Império não podem ser escondidas!",
  "Han! Good to see him safe. Friends you cannot forget, mmm?":
    "Han! Bom vê-lo a salvo. Amigos você não pode esquecer, mmm?",
  "Wait for me.":
    "Espere por mim.",

  // All 15 Original Mission Briefs
  "Hello, Luke!\n\nTroubled I am. Interrupt your training we must!\n\nYour mercenary friend, HAN SOLO, knows little of the Force. Yet vital to the Rebellion have he and his ship become. Why this is so is beyond a Jedi Master's understanding.\n\nNo matter! Jabba's agents have impounded the MILLENNIUM FALCON on Tattooine... again!\n\nRescue him you must, and free the Falcon!\n\nHere's something that will help you complete the task...":
    "Olá, Luke!\n\nPreocupado estou. Interromper seu treinamento nós devemos!\n\nSeu amigo mercenário, HAN SOLO, pouco sabe da Força. Mas vital para a Rebelião ele e sua nave se tornaram. Por que isso é assim está além da compreensão de um Mestre Jedi.\n\nNão importa! Agentes de Jabba confiscaram a MILLENNIUM FALCON em Tatooine... de novo!\n\nResgatá-lo você deve, e libertar a Falcon!\n\nAqui está algo que o ajudará a concluir a tarefa...",

  "There you are, Luke! Heard my call you did, yes!\n\nGENERAL MARUTZ, a leader of the Rebellion, has been kidnapped by stormtroopers. Danger there is, mmm?\n\nFly you must to the frigid snow planet Etorasp, and RESCUE the General... before Vader tortures the Rebel battle plans out of him!\n\nHere! Take this... help you it will!":
    "Aí está você, Luke! Ouviu meu chamado, sim!\n\nO GENERAL MARUTZ, um líder da Rebelião, foi sequestrado por stormtroopers. Há grande perigo, mmm?\n\nVoar você deve até o gélido planeta de neve Etorasp, e RESGATAR o General... antes que Vader torture os planos rebeldes dele!\n\nTome! Pegue isto... ajudará você!",

  "Luke! Time it is for your training to advance a step...\n\nThe Empire has set up a HIDDEN FACTORY in the snowy wastes of planet Neshtab, where they are building stormtrooper droids. These robots could tip the balance against the Rebel Alliance.\n\nFind this factory you must! Destroy it you must! \n\nHere! Help you finish what you start, this will...":
    "Luke! Hora de seu treinamento avançar mais um passo...\n\nO Império instalou uma FÁBRICA ESCONDIDA nas terras gélidas de Neshtab, onde estão construindo droides stormtroopers. Esses robôs podem desequilibrar a balança contra a Aliança Rebelde.\n\nEncontrar esta fábrica você deve! Destruí-la você deve!\n\nAqui! Ajudará você a terminar o que começou...",

  "Mmm! Opportunity do I sense for a young Jedi-in- training...\n\nYour friend Han, even more impetuous than yourself, has been frozen in carbonite, as he probably deserves.\n\nBut now Jabba the Hutt has foolishly relaxed his vigilance. A chance to free Solo there is, yes!\n\nFly to Tattooine you must! Take advantage of the moment, yes!\n\nMmm, nearly forgot! Take this! Help you it will...":
    "Mmm! Uma oportunidade eu sinto para um jovem aprendiz Jedi...\n\nSeu amigo Han, ainda mais impetuoso que você, foi congelado em carbonita, como provavelmente merecia.\n\nMas agora Jabba the Hutt tolamente relaxou a vigilância. Uma chance de libertar Solo existe, sim!\n\nVoar para Tatooine você deve! Aproveite o momento, sim!\n\nMmm, quase esqueci! Pegue isto! Ajudará você...",

  "Luke!\n\nA great disturbance in the Force there is... Princess Leia is MISSING! Her ship has been shot down on the forest planet Nibiru. Only you can save her!\n\nThis you will need...":
    "Luke!\n\nUma grande perturbação na Força há... A Princesa Leia está DESAPARECIDA! A nave dela foi abatida no planeta florestal Nibiru. Apenas você pode salvá-la!\n\nDisto você precisará...",

  "Luke! Again the dark side threatens...\n\nAt the Imperial Base in the sands of planet Argavat toils a brave officer who is secretly a Rebel spy. Ensign Waldron is his name. Stolen the IMPERIAL BATTLE CODE has he! \n\nFly to this desert world and relieve him of his burden you must... before Vader finds him!\n\nTake this! Without it you cannot succeed...":
    "Luke! Novamente o lado sombrio ameaça...\n\nNa Base Imperial nas areias de Argavat trabalha um bravo oficial secretamente espião Rebelde. Alferes Waldron é o nome dele. Roubou o CÓDIGO DE BATALHA IMPERIAL ele fez!\n\nVoar para esse mundo desértico você deve... antes que Vader o encontre!\n\nPegue isto! Sem isso você não conseguirá...",

  "Another ripple in the Force, Luke...\n\nTireless are the minions of the Emperor, mmm? On the forest world of Tarsa, a RELAY STATION have they erected. The Rebel cause cannot prevail while it remains in place. Find it you must and destroy it! \n\nThis will help you...":
    "Outra perturbação na Força, Luke...\n\nIncansáveis são os servos do Imperador, mmm? No mundo florestal de Tarsa, uma ESTAÇÃO DE TRANSMISSÃO eles ergueram. A causa Rebelde não triunfará enquanto ela existir. Encontrá-la você deve e destruí-la!\n\nIsto ajudará você...",

  "Ahh, there you are, Luke! The dark side never rests...\n\nAlthough the Death Star is no more, already the Empire has built another tool of terror and destruction on the airless moon of Varn. To destroy this new BATTLE STATION is your task...\n\nTake this, it will help you...":
    "Ahh, aí está você, Luke! O lado sombrio nunca descansa...\n\nEmbora a Estrela da Morte não exista mais, o Império já construiu outra arma de terror e destruição na lua sem ar de Varn. Destruir esta nova ESTAÇÃO DE BATALHA é sua tarefa...\n\nPegue isto, vai ajudá-lo...",

  "Luke! Great danger there is!\n\nThe Imperial Fleet has learned of the HIDDEN REBEL BASE on icy planet Thaldo. Attack is their plan! You must WARN the Rebels, Luke!\n\nOnly this can I give you...":
    "Luke! Grande perigo há!\n\nA Frota Imperial descobriu a BASE REBELDE ESCONDIDA no planeta gelado Thaldo. O ataque é o plano deles! Você deve AVISAR os Rebeldes, Luke!\n\nApenas isto posso lhe dar...",

  "Welcome, Luke! Heard my call you did!\n\nLong, long ago the Sith made an AMULET that can focus the Force for good or evil. Powerful it is... dangerous, mmm?\n\nWhen the Sith fell, the amulet was lost. Now a tremor in the Force warns me... the amulet has been found on the desert world of Bakkah!\n\nImperial troops have it now. Soon in Vader's hands will it be, unless you find it first!\n\nHere, take this object... small though it is, you'll need it on your quest...":
    "Bem-vindo, Luke! Ouviu meu chamado você fez!\n\nHá muito tempo os Sith criaram um AMULETO capaz de canalizar a Força para o bem ou para o mal. Poderoso ele é... perigoso, mmm?\n\nCom a queda dos Sith, o amuleto se perdeu. Agora um tremor na Força me avisa... o amuleto foi achado no mundo desértico de Bakkah!\n\nTropas imperiais o têm agora. Logo nas mãos de Vader estará, a menos que você o encontre primeiro!\n\nAqui, pegue este objeto... pequeno embora seja, precisará dele em sua jornada...",

  "Wait... I can feel a strong disturbance in the Force over here... it's some kind of message from Yoda!\n\nWhat...? What...? Taken to an Imperial Base on Lokondo! Trapped in an electro-cell! Vader & the Emperor preparing to interrogate...!\n\nI've got to RESCUE YODA before the Emperor reaches that base!\n\nHmm... what's this?":
    "Espere... posso sentir uma forte perturbação na Força por aqui... é algum tipo de mensagem de Yoda!\n\nO quê...? Levado para uma Base Imperial em Lokondo! Preso em uma eletro-cela! Vader e o Imperador preparando interrogatório...!\n\nTenho que RESGATAR YODA antes que o Imperador chegue à base!\n\nHmm... o que é isto?",

  "Weary am I, Luke...\n\nI feel an imbalance in the Force... a CLONING MACHINE there is, survivor of the Clone Wars, guarded by adherents of the old ways, mmm? I see it, buried under a mountain of snow and ice, but where to find it, I know not!\n\nFollow your feelings you must! Find your own way you must... but be warned: the greatest danger is YOURSELF!\n\nTake this and leave me alone... help you further I cannot!":
    "Cansado estou, Luke...\n\nSinto um desequilíbrio na Força... uma MÁQUINA DE CLONAGEM existe, sobrevivente das Guerras Clônicas, guardada por seguidores dos antigos costumes, mmm? Eu a vejo, sob uma montanha de neve e gelo, mas onde encontrá-la, não sei!\n\nSiga seus sentimentos você deve! Encontre seu próprio caminho... mas fique avisado: o maior perigo é VOCÊ MESMO!\n\nPegue isto e me deixe em paz... ajudá-lo mais eu não posso!",

  "Hello again, Luke...\n\nThe day will come when our friends the Ewoks will turn the tide of battle... it is their destiny!\n \nNow I learn they have lost their LANTERN OF SACRED LIGHT.  Without it their spirits are confused... and destiny they cannot fulfill, mmm?\n\nFly you must to the forest moon of Endor and find the Lantern!\n\nHere! May this guide you....":
    "Olá novamente, Luke...\n\nO dia chegará em que nossos amigos Ewoks virarão o rumo da batalha... é o destino deles!\n\nAgora soube que perderam sua LANTERNA DA LUZ SAGRADA. Sem ela, seus espíritos estão confusos... e seu destino não podem cumprir, mmm?\n\nVoar você deve até a lua florestal de Endor e encontrar a Lanterna!\n\nAqui! Que isto guie você...",

  "Luke! Resume your training we must, before it is too late, mmm?\n\nImperial troops have raided a mining operation on Halm. Why do they bother, I wonder, mmm?\n\nThey do it because they hope to find a rare ADEGAN CRYSTAL in the mine. If they take it, some young Jedi cannot his lightsaber make. Cannot then fight the Empire, no!\n\nFind the crystal first you must! Who knows... maybe some day you yourself may have need of it, mmm?\n\nHere! This will start you on your mission...":
    "Luke! Retomar seu treinamento devemos, antes que seja tarde demais, mmm?\n\nTropas imperiais atacaram uma mineradora em Halm. Por que se importam, eu me pergunto, mmm?\n\nEles fazem isso esperando encontrar um raro CRISTAL ADEGAN na mina. Se o levarem, algum jovem Jedi não poderá seu sabre de luz construir. Não poderá combater o Império, não!\n\nEncontrar o cristal primeiro você deve! Quem sabe... talvez você mesmo precise dele um dia, mmm?\n\nAqui! Isto dará início à sua missão...",

  "There you are!\n\nOnce again your Rebel friends are in trouble... this time it is THREEPIO.\n\nWhile operating as an undercover agent in the desert wastes of Tozeer, he was captured by Sand People. Dismantled him and scattered the parts they have!\n\nTread carefully! Jawas have scrounged at least one of the pieces. They are the only ones on Tozeer who can put him back together again...\n\nTake this with you. Perhaps your quest it will help...":
    "Aí está você!\n\nMais uma vez seus amigos Rebeldes estão em apuros... desta vez é o C-3PO.\n\nEnquanto operava como agente infiltrado no deserto de Tozeer, ele foi capturado pelo Povo da Areia. Desmontaram ele e espalharam as peças!\n\nCuidado! Os Jawas encontraram ao menos uma das partes. Eles são os únicos em Tozeer capazes de montá-lo novamente...\n\nLeve isto com você. Talvez ajude em sua busca...",

  // Mission Objectives & Summaries
  "Free the FALCON, Luke!": "Liberte a FALCON, Luke!",
  "Rescue GENERAL MARUTZ, Luke!": "Resgate o GENERAL MARUTZ, Luke!",
  "Destroy the HIDDEN FACTORY, Luke!": "Destrua a FÁBRICA ESCONDIDA, Luke!",
  "Rescue HAN, Luke!": "Resgate o HAN, Luke!",
  "FIND LEIA you must... you are her only hope!": "ENCONTRAR LEIA você deve... você é a única esperança dela!",
  "Take the IMPERIAL BATTLE CODE from Ensign Waldron, Luke!": "Pegue o CÓDIGO DE BATALHA IMPERIAL do Alferes Waldron, Luke!",
  "Destroy the RELAY STATION in the Tarsa System, Luke!": "Destrua a ESTAÇÃO DE TRANSMISSÃO no Sistema Tarsa, Luke!",
  "Destroy the IMPERIAL BATTLE STATION in the Varn system, Luke!": "Destrua a ESTAÇÃO DE BATALHA IMPERIAL no sistema Varn, Luke!",
  "Find the hidden base and WARN THE REBELS, Luke!": "Encontre a base secreta e AVISE OS REBELDES, Luke!",
  "Retrieve the AMULET, Luke!": "Recupere o AMULETO, Luke!",
  "I better head for Lokondo and RESCUE YODA!": "É melhor eu ir para Lokondo e RESGATAR YODA!",
  "On your own you are this time, Luke...": "Por conta própria você está desta vez, Luke...",
  "Return the LANTERN OF SACRED LIGHT to the Ewoks, Luke!": "Devolva a LANTERNA DA LUZ SAGRADA aos Ewoks, Luke!",
  "Find the ADEGAN CRYSTAL, Luke!": "Encontre o CRISTAL ADEGAN, Luke!",
  "Find THREEPIO's PARTS and put him back together!": "Encontre as PEÇAS DE C-3PO e monte-o novamente!",

  // Common In-Game Dialogues
  "You're in fine shape now, sir!":
    "Você está em ótima forma agora, senhor!",
  "I'm amazed at your recovery. Please watch yourself in the future, sir!":
    "Estou impressionado com sua recuperação. Por favor, tome mais cuidado no futuro, senhor!",
  "Congratulations on your good work, sir!":
    "Parabéns pelo excelente trabalho, senhor!",
  "Stars above, sir, you're lucky to be alive! But there's no wound I can't heal!":
    "Pelos céus, senhor, tem sorte de estar vivo! Mas não há ferimento que eu não possa curar!",
  "Been in combat, sir? Here, let me heal those wounds...":
    "Esteve em combate, senhor? Venha, deixe-me curar esses ferimentos...",
  "I see you've run into some difficulties, sir, but you're still doing well. You don't need me yet.":
    "Vejo que enfrentou algumas dificuldades, senhor, mas ainda está bem. Não precisa de mim ainda.",
  "You don't need my help now, sir.  You're ready for battle!":
    "Não precisa da minha ajuda agora, senhor. Você está pronto para a batalha!",
  "Try to find a LOCATOR, sir! WEAPONS too! In the long run, they'll help you more than I can!":
    "Tente encontrar um LOCALIZADOR, senhor! E ARMAS também! No longo prazo, ajudarão mais do que eu!",
  "Greetings, sir! Welcome to our planet. If you need my services, please don't hesitate to visit.":
    "Saudações, senhor! Bem-vindo ao nosso planeta. Se precisar dos meus serviços médicos, não hesite em visitar.",
  "I'd better get back to Dagobah and talk to Yoda!":
    "É melhor eu voltar para Dagobah e falar com Yoda!",
  "Move along!":
    "Circulando, circulando!",
  "I don't see any way to open this door... There's no key card slot!":
    "Não vejo como abrir esta porta... Não há entrada para cartão de acesso!",
  "Aha! There's a key card slot here...":
    "Aha! Há uma entrada para cartão de acesso aqui...",
  "That's the right idea, but not quite the right charge I need...":
    "A ideia é boa, mas não é exatamente a carga de que preciso...",
  "Uh-oh... sealed! Maybe I can force my way in somehow...":
    "Uh-oh... trancado! Talvez eu consiga forçar a entrada de alguma forma...",
  "Got anything to trade?":
    "Tem algo para negociar?",
  "Aha! For hard currency, we have a special deal!":
    "Aha! Para dinheiro vivo, temos uma oferta especial!",
  "That's a generous offer, but no thanks...":
    "É uma oferta generosa, mas dispenso...",
  "I'll take it... but is this the best you can do?":
    "Eu aceito... mas é o melhor que pode fazer?",
  "Good junk... not too rusty...":
    "Boa sucata... não muito enferrujada...",
  "A pleasure doing business with you...":
    "Um prazer fazer negócios com você...",
  "I'm not sure this trade is wise, but...":
    "Não tenho certeza se esta troca é sábia, mas...",
  "Ahh, the young always feel invincible...":
    "Ahh, os jovens sempre se sentem invencíveis...",
  "Remember, if you get killed... no more trades!":
    "Lembre-se, se você morrer... nada de trocas!",
  "Nice day...":
    "Belo dia...",
  "Hot around here...":
    "Muito quente por aqui...",
  "Don't say I told you, but an Imperial patrol came through here yesterday...":
    "Não diga que fui eu quem falou, mas uma patrulha Imperial passou por aqui ontem...",
};

const SPEAKERS_PT_BR: Record<string, string> = {
  'Luke Skywalker': 'Luke Skywalker',
  'Yoda': 'Mestre Yoda',
  'Yoda Stories': 'Yoda Stories',
  'R2-D2': 'R2-D2',
  'Artoo': 'R2-D2',
  'Boba Fett': 'Boba Fett',
  'Medical Droid': 'Droide Médico',
  'Jawa': 'Jawa',
  'Stormtrooper': 'Stormtrooper',
  'Princess Leia': 'Princesa Leia',
  'Han Solo': 'Han Solo',
  'C-3PO': 'C-3PO',
  'General Marutz': 'General Marutz',
  'Ensign Waldron': 'Alferes Waldron',
};

const ITEMS_PT_BR: Record<string, string> = {
  'Lightsaber': 'Sabre de Luz',
  'Blaster': 'Blaster',
  'Blaster Rifle': 'Rifle Blaster',
  'Thermal Detonator': 'Detonador Térmico',
  'Locator': 'Localizador',
  'Rebel First Aid Kit': 'Kit Médico Rebelde',
  'Bacta Fluid': 'Fluido de Bacta',
  'Red Key Card': 'Cartão de Acesso Vermelho',
  'Blue Key Card': 'Cartão de Acesso Azul',
  'Green Key Card': 'Cartão de Acesso Verde',
  'Yellow Key Card': 'Cartão de Acesso Amarelo',
  'Purple Key Card': 'Cartão de Acesso Roxo',
  'Orange Key Card': 'Cartão de Acesso Laranja',
  'The Force': 'A Força',
  'THE FORCE': 'A Força',
  '10,000 Credits': '10.000 Créditos',
  'Dianoga Heart': 'Coração de Dianoga',
  'Star Sapphire': 'Safira Estelar',
  'Spirit Heart': 'Coração Espiritual',
  'Imperial Battle Code': 'Código de Batalha Imperial',
  'Millennium Falcon': 'Millennium Falcon',
  'Cloaking Device': 'Dispositivo de Camuflagem',
  'Sith Amulet': 'Amuleto Sith',
  'Adegan Crystal': 'Cristal Adegan',
  'Lantern of Sacred Light': 'Lanterna da Luz Sagrada',
  'Swamp Bug': 'Inseto do Pântano',
  'Vial of Tibanna Gas': 'Frasco de Gás Tibanna',
  'Thermal Cape': 'Capa Térmica',
  'Bar of Durasteel': 'Barra de Durasteel',
  'Holocron': 'Holocron',
  'Holocube': 'Holocubo',
  'Power Converter': 'Conversor de Energia',
  'Junk': 'Sucata',
  'Alluvial Damper': 'Amortecedor Aluvial',
  'Restraining Bolt': 'Parafuso de Contenção',
  'Power Prybar': 'Pé-de-Cabra Energético',
  'Shield Generator': 'Gerador de Escudos',
  'Comm Unit': 'Unidade de Comunicação',
  'Data Card': 'Cartão de Dados',
  'Sample of Ryll': 'Amostra de Ryll',
  'Fusion Welder': 'Soldador de Fusão',
  'Beamdrill': 'Broca de Raio',
  'Sensor Pack': 'Pacote de Sensores',
  'Decoder': 'Decodificador',
  'Electrolockpick': 'Ganzua Eletrônica',
  'Glow Rod': 'Bastão Luminoso',
  'Hydrospanner': 'Chave Hidráulica',
  'Utility Belt': 'Cinto de Utilidades',
  'Breath Mask': 'Máscara de Oxigênio',
  'Comlink': 'Comlink',
};

export function translateDialogue(text: string): string {
  if (getLanguage() !== 'pt-BR' || !text) return text;
  const key = normalizeKey(text);
  return DIALOGUES_PT_BR[key] || text;
}

export function translateSpeaker(speaker: string): string {
  if (getLanguage() !== 'pt-BR' || !speaker) return speaker;
  return SPEAKERS_PT_BR[speaker] || speaker;
}

export function translateItemName(name: string): string {
  if (getLanguage() !== 'pt-BR' || !name) return name;
  return ITEMS_PT_BR[name] || name;
}
