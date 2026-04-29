const fs = require('fs');

const pools_first = `    $pools = [
        'Human' => [
            $M => [
                'John', 'Thomas', 'William', 'Robert', 'Edward', 'Henry', 'Richard', 'James', 'George', 'Arthur', 'Frederick', 'Albert', 'Harold', 'Walter', 'Edmund', 'Roger', 'Hugh', 'Gilbert', 'Ralph', 'Godfrey',
                'Bran', 'Cormac', 'Niall', 'Declan', 'Finn', 'Oisin', 'Ciaran', 'Lorcan', 'Padraig', 'Eamon', 'Callum', 'Colm', 'Kieran', 'Donal', 'Cathal', 'Tadhg',
                'Bjorn', 'Erik', 'Ragnar', 'Sven', 'Leif', 'Harald', 'Sigurd', 'Ulf', 'Gunnar', 'Olaf', 'Ivar', 'Magnus', 'Haldor', 'Torsten', 'Vidar', 'Dag', 'Knut', 'Brynjar',
                'Marco', 'Lorenzo', 'Dante', 'Luciano', 'Silvio', 'Rafael', 'Miguel', 'Diego', 'Esteban', 'Carlos', 'Antonio', 'Mateo', 'Cesare', 'Paolo', 'Alejandro',
                'Dmitri', 'Boris', 'Gregor', 'Yuri', 'Ivan', 'Pavel', 'Mikhail', 'Vasily', 'Alexei', 'Nikolai', 'Stanislav', 'Marek', 'Jaroslav', 'Bogdan', 'Kazimir',
                'Rashid', 'Tariq', 'Jamal', 'Salim', 'Farid', 'Nasir', 'Idris', 'Khalid', 'Karim', 'Amir', 'Hassan', 'Omar', 'Yusef', 'Samir', 'Hamza',
                'Kenji', 'Takeshi', 'Hiro', 'Ryo', 'Jin', 'Wei', 'Liang', 'Shen',
                'Aldric', 'Gareth', 'Cedric', 'Percival', 'Wystan', 'Eadric', 'Godwin', 'Alden', 'Marden', 'Voss', 'Tarl', 'Corwin', 'Dryden', 'Holt', 'Jasper', 'Kellan', 'Osric', 'Thane', 'Wren', 'Caspian',
                'Aric', 'Bram', 'Caelen', 'Dael', 'Elias', 'Fane', 'Garrick', 'Harkon', 'Ian', 'Jovan', 'Kael', 'Lander', 'Merrick', 'Nyle', 'Orin', 'Pael', 'Quin', 'Rael', 'Soren', 'Teague', 'Ulysses', 'Vane', 'Wyatt', 'Xael', 'Yorick', 'Zane',
                'Aiden', 'Brady', 'Colin', 'Damon', 'Ewan', 'Flynn', 'Griffin', 'Holden', 'Isaac', 'Jace', 'Kai', 'Liam', 'Miles', 'Nolan', 'Owen', 'Pierce', 'Quinn', 'Rowan', 'Silas', 'Tristan', 'Uri', 'Vance', 'Wade', 'Xander', 'Yates', 'Zeke',
                'Anton', 'Bastian', 'Cyrus', 'Darius', 'Ezra', 'Felix', 'Gideon', 'Hector', 'Ilias', 'Julian', 'Kian', 'Lucian', 'Marius', 'Nico', 'Octavius', 'Philo', 'Quintus', 'Roman', 'Simon', 'Titus', 'Urbain', 'Valerius', 'Wolfgang', 'Xanthus', 'Yvain', 'Zenon',
            ],
            $F => [
                'Mary', 'Elizabeth', 'Alice', 'Catherine', 'Margaret', 'Eleanor', 'Rose', 'Grace', 'Emily', 'Sarah', 'Anne', 'Jane', 'Charlotte', 'Harriet', 'Martha', 'Beatrice', 'Winifred', 'Dorothy', 'Agnes', 'Matilda',
                'Niamh', 'Saoirse', 'Aisling', 'Ciara', 'Maeve', 'Brigid', 'Deirdre', 'Grainne', 'Fiona', 'Siobhan', 'Riona', 'Eilish', 'Aoife', 'Sinead', 'Cara',
                'Freya', 'Ingrid', 'Hilda', 'Sigrid', 'Gudrun', 'Helga', 'Thyra', 'Ragna', 'Brynhild', 'Solveig', 'Dagny', 'Inga', 'Yrsa', 'Sif',
                'Isabella', 'Sofia', 'Lucia', 'Valentina', 'Giuliana', 'Rosa', 'Camilla', 'Francesca', 'Adriana', 'Paloma', 'Carmen', 'Pilar',
                'Katya', 'Nadia', 'Tatiana', 'Svetlana', 'Olga', 'Marta', 'Lada', 'Yelena', 'Milena', 'Zora', 'Darina', 'Galina',
                'Fatima', 'Zahra', 'Amira', 'Layla', 'Salma', 'Noor', 'Jamila', 'Halima', 'Rania', 'Safiya', 'Yasmin', 'Samira', 'Naira', 'Dalia',
                'Mei', 'Yuki', 'Hana', 'Lin', 'Sakura', 'Aiko', 'Ren',
                'Elspeth', 'Morwen', 'Rhiannon', 'Gwyneth', 'Brielle', 'Daphne', 'Marcella', 'Rowena', 'Talia', 'Wynne', 'Cressida', 'Jessamine', 'Linnea', 'Petra', 'Ondine', 'Sabine',
                'Aria', 'Bella', 'Clara', 'Diana', 'Elena', 'Flora', 'Gia', 'Hazel', 'Iris', 'Jade', 'Kira', 'Luna', 'Maya', 'Nova', 'Opal', 'Pearl', 'Quinn', 'Ruby', 'Stella', 'Tessa', 'Una', 'Vera', 'Willa', 'Xena', 'Yara', 'Zara',
                'Amelia', 'Bianca', 'Celia', 'Delia', 'Eliza', 'Fiona', 'Gloria', 'Helena', 'Isla', 'Julia', 'Kyla', 'Lila', 'Mila', 'Nina', 'Olivia', 'Penelope', 'Qiana', 'Rhea', 'Sylvia', 'Thalia', 'Ursula', 'Victoria', 'Wanda', 'Xenia', 'Yolanda', 'Zelda',
                'Anya', 'Bree', 'Cora', 'Dana', 'Eden', 'Faye', 'Gwen', 'Hope', 'Inez', 'Joy', 'Kaya', 'Leah', 'Mina', 'Nora', 'Orla', 'Pia', 'Roza', 'Skye', 'Tara', 'Uma', 'Vida', 'Wren', 'Xia', 'Yael', 'Zia',
            ],
        ],
        'Elf' => [
            $M => [
                'Arannis', 'Berrian', 'Caelin', 'Daeron', 'Erevan', 'Faelorn', 'Galinndan', 'Hadarai', 'Ivellios', 'Kaelar', 'Laucian', 'Mindartis', 'Naivaxos', 'Paelias', 'Quarion', 'Riardon', 'Soveliss', 'Thamior', 'Varis', 'Adran',
                'Aramil', 'Enialis', 'Himo', 'Immeral', 'Mialee', 'Peren', 'Tanis', 'Therivel', 'Carric', 'Heian', 'Lucan', 'Aust', 'Beiro', 'Erdan', 'Gennal', 'Theren', 'Althir', 'Celeborn', 'Elandil', 'Ilphas',
                'Aeson', 'Baelen', 'Cyril', 'Durothil', 'Elir', 'Faergol', 'Glaive', 'Halafarin', 'Iliyan', 'Jonik', 'Kymil', 'Lyr', 'Maiele', 'Nesterin', 'Orist', 'Phann', 'Qilue', 'Rennyn', 'Silvyr', 'Tassar', 'Ualair', 'Vesryn', 'Wylander', 'Xero', 'Yathlan', 'Zhor',
                'Aenor', 'Belanor', 'Caeldor', 'Daelin', 'Elenor', 'Faelin', 'Gaelin', 'Haelin', 'Ilinor', 'Jaelin', 'Kaelin', 'Laelin', 'Maelin', 'Naelin', 'Oelin', 'Paelin', 'Qaelin', 'Raelin', 'Saelin', 'Taelin', 'Uelin', 'Vaelin', 'Waelin', 'Xaelin', 'Yaelin', 'Zaelin',
            ],
            $F => [
                'Adrie', 'Birel', 'Caelynn', 'Drusilia', 'Enna', 'Felosial', 'Galadwen', 'Ielenia', 'Keyleth', 'Lia', 'Meriele', 'Naivara', 'Quelenna', 'Sariel', 'Shanairra', 'Valanthe', 'Xanaphia', 'Bethrynna', 'Jelenneth', 'Shava', 'Silaqui', 'Anwyn', 'Chaedi', 'Imra', 'Vadania',
                'Althaea', 'Caladwen', 'Elanor', 'Galadriel', 'Hirileth', 'Mirelda', 'Nimue', 'Taelora', 'Resiri', 'Aravae', 'Ilanis', 'Tessara',
                'Amara', 'Brey', 'Caryth', 'Dara', 'Elora', 'Feynn', 'Gyl', 'Halana', 'Ilyra', 'Jastra', 'Kyra', 'Lyari', 'Nalia', 'Olyra', 'Phyrah', 'Qyra', 'Ryl', 'Syra', 'Tyra', 'Ulyra', 'Vyra', 'Wyra', 'Xyra', 'Yyra', 'Zyra',
                'Aelrie', 'Baelrie', 'Caelrie', 'Daelrie', 'Eaelrie', 'Faelrie', 'Gaelrie', 'Haelrie', 'Iaelrie', 'Jaelrie', 'Kaelrie', 'Laelrie', 'Maelrie', 'Naelrie', 'Oaelrie', 'Paelrie', 'Qaelrie', 'Raelrie', 'Saelrie', 'Taelrie', 'Uaelrie', 'Vaelrie', 'Waelrie', 'Xaelrie', 'Yaelrie', 'Zaelrie',
            ],
        ],
        'Dwarf' => [
            $M => [
                'Adrik', 'Barendd', 'Brottor', 'Eberk', 'Einkil', 'Gardain', 'Harbek', 'Kildrak', 'Morgran', 'Orsik', 'Taklinn', 'Thoradin', 'Tordek', 'Traubon', 'Vondal', 'Bruenor', 'Dain', 'Darrak', 'Diesa', 'Flint', 'Gimli',
                'Grumbar', 'Helgar', 'Korgan', 'Rurik', 'Ulfgar', 'Thorbek', 'Dolgrim', 'Bhaldric', 'Faltor', 'Gorin', 'Hurgar', 'Jorn', 'Kragdin', 'Murak', 'Naldur', 'Sturm', 'Balin', 'Durin', 'Gloin',
                'Adalbert', 'Bofur', 'Bombur', 'Bram', 'Dori', 'Dwalin', 'Fili', 'Kili', 'Nori', 'Oin', 'Ori', 'Thranduil', 'Thorin', 'Fundin', 'Gror', 'Nain', 'Thror', 'Dain', 'Borin', 'Gimli',
                'Algrit', 'Balgrit', 'Calgrit', 'Dalgrit', 'Elgrit', 'Falgrit', 'Galgrit', 'Halgrit', 'Ilgrit', 'Jalgrit', 'Kalgrit', 'Lalgrit', 'Malgrit', 'Nalgrit', 'Olgrit', 'Palgrit', 'Qalgrit', 'Ralgrit', 'Salgrit', 'Talgrit', 'Ulgrit', 'Valgrit', 'Walgrit', 'Xalgrit', 'Yalgrit', 'Zalgrit',
            ],
            $F => [
                'Amber', 'Artin', 'Audhild', 'Dagnal', 'Diesa', 'Eldeth', 'Gunnloda', 'Helja', 'Kathra', 'Kristryd', 'Mardred', 'Riswynn', 'Torgga', 'Vistra', 'Bardryn', 'Falkrunn', 'Hlakka', 'Ilde', 'Liftrasa', 'Sannl', 'Torbera',
                'Gurdis', 'Brynja', 'Helga', 'Ingra', 'Soldra', 'Torunn', 'Vonara', 'Dagmar', 'Kethra',
                'Algra', 'Balfra', 'Calgra', 'Dalfra', 'Elgra', 'Falfra', 'Galgra', 'Halfra', 'Ilgra', 'Jalfra', 'Kalgra', 'Lalfra', 'Malgra', 'Nalfra', 'Olgra', 'Palfra', 'Qalgra', 'Ralfra', 'Salgra', 'Talfra', 'Ulgra', 'Valfra', 'Walgra', 'Xalfra', 'Yalgra', 'Zalfra',
                'Agate', 'Beryl', 'Coral', 'Diamond', 'Emerald', 'Garnet', 'Ivory', 'Jade', 'Mica', 'Onyx', 'Opal', 'Pearl', 'Ruby', 'Sapphire', 'Topaz', 'Turquoise',
            ],
        ],
        'Halfling' => [
            $M => [
                'Alton', 'Corrin', 'Eldon', 'Garret', 'Lyle', 'Milo', 'Osborn', 'Roscoe', 'Wellby', 'Cade', 'Finnan', 'Lindal', 'Merric', 'Nebin', 'Pimple', 'Reed', 'Bramble', 'Caleb', 'Dewey', 'Erky', 'Faldo', 'Jasper', 'Lavender', 'Nix', 'Pippen', 'Regis', 'Sam', 'Tolman', 'Wendel', 'Birch',
                'Albin', 'Bilbo', 'Drogo', 'Fastolph', 'Frodo', 'Gorbadoc', 'Halfast', 'Hugo', 'Lalia', 'Longo', 'Otho', 'Paladin', 'Peregrin', 'Rufus', 'Sancho', 'Tobold', 'Will', 'Bodo', 'Cotman', 'Dinodas', 'Fosco', 'Gruffo', 'Harding', 'Jolly', 'Longo', 'Mungo', 'Odo', 'Nob', 'Robin',
                'Arb', 'Barb', 'Carb', 'Darb', 'Farb', 'Garb', 'Harb', 'Jarb', 'Karb', 'Larb', 'Marb', 'Narb', 'Parb', 'Tarb', 'Varb', 'Warb', 'Yarb', 'Zarb',
            ],
            $F => [
                'Andry', 'Bree', 'Callie', 'Cora', 'Euphemia', 'Jillian', 'Kithri', 'Lavinia', 'Lidda', 'Merla', 'Nedda', 'Paela', 'Portia', 'Seraphina', 'Shaena', 'Trym', 'Vani', 'Verna', 'Wella', 'Amaryllis', 'Chenna', 'Dahlia', 'Eglantine', 'Filomena', 'Gretchen', 'Hettie', 'Ivy', 'Josie', 'Pearl', 'Tansy',
                'Angelica', 'Belladonna', 'Camellia', 'Daisy', 'Estella', 'Gilly', 'Hilda', 'Lily', 'Marigold', 'Pansy', 'Primrose', 'Rose', 'Salvia', 'Tulip', 'Violet', 'Myrtle', 'Petunia', 'Poppy', 'Rosie', 'Ruby', 'Lobelia', 'Mentha', 'Nerina', 'Orchid', 'Peony', 'Rosamunda',
                'Ami', 'Cami', 'Dami', 'Fami', 'Gami', 'Jami', 'Lami', 'Mami', 'Nami', 'Pami', 'Rami', 'Sami', 'Tami', 'Vami', 'Wami', 'Yami', 'Zami',
            ],
        ],
        'Gnome' => [
            $M => [
                'Alston', 'Boddynock', 'Brocc', 'Dimble', 'Eldon', 'Erky', 'Fonkin', 'Gerbo', 'Gimble', 'Glim', 'Jebeddo', 'Namfoodle', 'Roondar', 'Seebo', 'Warryn', 'Wrenn', 'Zook', 'Bimpnottin', 'Caramip', 'Pog', 'Queck', 'Sindri', 'Torbo', 'Fibbit', 'Kelgore', 'Murnig', 'Oddly', 'Pilwick', 'Rundle', 'Tipple',
                'Arjhan', 'Balasar', 'Bharash', 'Donaar', 'Ghesh', 'Heskan', 'Kriv', 'Medrash', 'Mehen', 'Nadarr', 'Pandjed', 'Patrin', 'Rhogar', 'Shamash', 'Shedinn', 'Tarhun', 'Torinn',
                'Bing', 'Boing', 'Bloop', 'Bop', 'Clip', 'Clop', 'Drip', 'Drop', 'Fiz', 'Gag', 'Gig', 'Gog', 'Hic', 'Hop', 'Jig', 'Kip', 'Lop', 'Mip', 'Nip', 'Pip', 'Pop', 'Rip', 'Sip', 'Tip', 'Zip',
            ],
            $F => [
                'Bimpnottin', 'Breena', 'Carlin', 'Donella', 'Duvamil', 'Ellyjobell', 'Lini', 'Loopmottin', 'Nissa', 'Nyx', 'Oda', 'Orla', 'Roywyn', 'Shamil', 'Tana', 'Waywocket', 'Zanna', 'Calliope', 'Dabble', 'Fizzy', 'Gizmo', 'Jynx', 'Kelda', 'Minx', 'Pip', 'Quill', 'Sprocket', 'Twiddle', 'Whisper', 'Zinnia',
                'Akra', 'Biri', 'Daar', 'Farideh', 'Harann', 'Havilar', 'Jheri', 'Kava', 'Korinn', 'Mishann', 'Nala', 'Perra', 'Raiann', 'Sora', 'Surina', 'Thava', 'Uadjit',
                'Bling', 'Clink', 'Dink', 'Flit', 'Glim', 'Jinx', 'Kink', 'Link', 'Mink', 'Pink', 'Rink', 'Sink', 'Tink', 'Wink', 'Zink', 'Dazzle', 'Sparkle', 'Twinkle', 'Shine', 'Glint',
            ],
        ],
        'Half-Elf' => [
            $M => [
                'Aeron', 'Caelin', 'Darian', 'Elias', 'Galahad', 'Harlan', 'Julian', 'Loren', 'Mikael', 'Phelan', 'Quentin', 'Sylvan', 'Tristan', 'Variel', 'Arlen', 'Davin', 'Erevan', 'Galen', 'Kelvin', 'Liam', 'Merrick', 'Rainer', 'Soren', 'Adrian', 'Dorian', 'Emeric', 'Kael', 'Leander', 'Taren', 'Corin',
                'Ander', 'Blan', 'Cal', 'Dan', 'El', 'Falk', 'Hal', 'Jax', 'Kev', 'Lex', 'Mar', 'Niv', 'Olv', 'Perr', 'Quin', 'Ran', 'Sev', 'Tev', 'Vorn', 'Zan',
                'Aramil', 'Caryd', 'Evindal', 'Filarion', 'Garieth', 'Ilifael', 'Jhan', 'Keerla', 'Leri', 'Mika', 'Nivian', 'Orion', 'Pael', 'Quinlan', 'Rian', 'Sian', 'Tari', 'Uri', 'Vian', 'Zian',
            ],
            $F => [
                'Arwen', 'Brenna', 'Cerys', 'Dahlia', 'Estelle', 'Fianna', 'Gwendolyn', 'Helena', 'Iriel', 'Kaelin', 'Liriel', 'Miriel', 'Nerys', 'Oriana', 'Rhosyn', 'Sylvie', 'Tessara', 'Vivienne', 'Ariadne', 'Celeste', 'Eleanora', 'Ilyana', 'Lenore', 'Mirabelle', 'Rosalind', 'Seline', 'Tamsin', 'Wisteria', 'Yvaine', 'Zillah',
                'Alma', 'Cora', 'Delia', 'Elma', 'Gala', 'Hala', 'Ila', 'Jala', 'Kala', 'Lala', 'Mala', 'Nola', 'Pola', 'Rola', 'Sala', 'Tala', 'Vala', 'Zala',
                'Ael', 'Bael', 'Cael', 'Dael', 'Erael', 'Fael', 'Gael', 'Hael', 'Irael', 'Jael', 'Kael', 'Lael', 'Mael', 'Nael', 'Orael', 'Pael', 'Qael', 'Rael', 'Sael', 'Tael', 'Urael', 'Vael', 'Wael', 'Xael', 'Yael', 'Zael',
            ],
        ],
        'Half-Orc' => [
            $M => [
                'Dench', 'Feng', 'Gell', 'Henk', 'Holg', 'Imsh', 'Kelh', 'Krusk', 'Mhurren', 'Ront', 'Shump', 'Thokk', 'Grukk', 'Thrak', 'Morg', 'Gash', 'Urzog', 'Brug', 'Krag', 'Droog', 'Bolg', 'Goroth', 'Muzgash', 'Lagduf', 'Ufthak', 'Snaga', 'Gorbag', 'Mauhur', 'Ugluk', 'Brukk',
                'Aarnt', 'Bornt', 'Cornt', 'Dornt', 'Fornt', 'Gornt', 'Hornt', 'Jornt', 'Kornt', 'Lornt', 'Mornt', 'Nornt', 'Pornt', 'Rornt', 'Sornt', 'Tornt', 'Vornt', 'Wornt', 'Yornt', 'Zornt',
                'Brak', 'Crak', 'Drak', 'Frak', 'Grak', 'Hrak', 'Jrak', 'Krak', 'Lrak', 'Mrak', 'Nrak', 'Prak', 'Rrak', 'Srak', 'Trak', 'Vrak', 'Wrak', 'Yrak', 'Zrak',
            ],
            $F => [
                'Baggi', 'Emen', 'Engong', 'Kansif', 'Myev', 'Neega', 'Ovak', 'Ownka', 'Shautha', 'Vola', 'Yevelda', 'Grenda', 'Hruga', 'Luthash', 'Murga', 'Nulga', 'Rogah', 'Shura', 'Togga', 'Volga',
                'Aga', 'Baga', 'Caga', 'Daga', 'Faga', 'Gaga', 'Haga', 'Jaga', 'Kaga', 'Laga', 'Maga', 'Naga', 'Paga', 'Raga', 'Saga', 'Taga', 'Vaga', 'Waga', 'Yaga', 'Zaga',
                'Asha', 'Basha', 'Casha', 'Dasha', 'Fasha', 'Gasha', 'Hasha', 'Jasha', 'Kasha', 'Lasha', 'Masha', 'Nasha', 'Pasha', 'Rasha', 'Sasha', 'Tasha', 'Vasha', 'Washa', 'Yasha', 'Zasha',
            ],
        ],
    ];`;

const pools_sur = `    $pools = [
        'Human' => [
            'Baker', 'Smith', 'Cooper', 'Tanner', 'Fletcher', 'Mason', 'Thatcher', 'Carpenter', 'Turner', 'Weaver', 'Fuller', 'Dyer', 'Potter', 'Chandler', 'Porter', 'Archer', 'Shepherd', 'Fisher', 'Miller', 'Barker',
            'Oakwood', 'Greenfield', 'Thornton', 'Ashford', 'Brooking', 'Heathrow', 'Fairweather', 'Brightwater', 'Coldwell', 'Deepvale', 'Elmsworth', 'Foxley', 'Greystone', 'Hartwood', 'Irondale', 'Lakewood', 'Moorland', 'Northwood', 'Redcliffe', 'Stormwind', 'Whitfield', 'Woodward', 'Yarborough',
            'Strong', 'Swift', 'Bold', 'Stern', 'Bravehart', 'Trueman', 'Goodfellow', 'Clearwater', 'Longstrider', 'Warwick', 'Blackwood', 'Dunbar', 'Hargrave', 'Montague', 'Prescott', 'Sinclair', 'Aldridge', 'Caulfield', 'Fairfax', 'Grimshaw', 'Holloway', 'Kendrick', 'Lockhart', 'Pemberton', 'Whitmore',
            'Adams', 'Allen', 'Anderson', 'Bailey', 'Baker', 'Barnes', 'Bell', 'Bennett', 'Brooks', 'Brown', 'Campbell', 'Carter', 'Clark', 'Collins', 'Cook', 'Cooper', 'Cox', 'Davis', 'Edwards', 'Evans', 'Floyd', 'Foster', 'Garcia', 'Gonzales', 'Gray', 'Green', 'Hall', 'Harris', 'Hernandez', 'Hill', 'Howard', 'Hughes', 'Jackson', 'James', 'Jenkins', 'Johnson', 'Jones', 'Kelly', 'King', 'Lee', 'Lewis', 'Long', 'Lopez', 'Martin', 'Martinez', 'Miller', 'Mitchell', 'Moore', 'Morgan', 'Morris', 'Murphy', 'Nelson', 'Ortiz', 'Parker', 'Perez', 'Perry', 'Peterson', 'Phillips', 'Price', 'Ramirez', 'Reed', 'Reyes', 'Richardson', 'Rivera', 'Roberts', 'Robinson', 'Rodriguez', 'Rogers', 'Ross', 'Russell', 'Sanchez', 'Sanders', 'Scott', 'Smith', 'Stewart', 'Sullivan', 'Taylor', 'Thomas', 'Thompson', 'Torres', 'Turner', 'Walker', 'Ward', 'Washington', 'Watson', 'White', 'Williams', 'Wilson', 'Wood', 'Wright', 'Young',
            'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White', 'Lopez', 'Lee', 'Gonzalez', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Perez', 'Hall', 'Young', 'Allen', 'Sanchez', 'Wright', 'King', 'Scott',
        ],
        'Elf' => [
            'Silverleaf', 'Moonwhisper', 'Starweaver', 'Dawnrunner', 'Nightbreeze', 'Sunpetal', 'Willowsong', 'Oakshade', 'Thornvale', 'Riverwild', 'Starsigh', 'Mistwalker', 'Greenmantle', 'Windborn', 'Dewdancer', 'Amakiir', 'Galanodel', 'Holimion', 'Liadon', 'Meliamne', 'Nailo', 'Siannodel', 'Ilphukiir', 'Xiloscient', 'Faeyond', 'Aelorothi', 'Celthirion', 'Daelynn', 'Feywander', 'Glitterdew', 'Ivorymist',
            'Starflower', 'Moonrise', 'Sunfall', 'Dewdrop', 'Nightfall', 'Dawnlight', 'Riverstone', 'Woodshadow', 'Leafsong', 'Windrunner', 'Skydancer', 'Frostwhisper', 'Flameheart', 'Ashwood', 'Ironbark', 'Swiftstream', 'Clearwater', 'Stillpool', 'Highpeak', 'Deepvale',
            'Aeravansel', 'Camaelor', 'Erlathan', 'Fashar', 'Gwaelin', 'Haryal', 'Iliathor', 'Jhaan', 'Keryth', 'Lathalas', 'Mirthal', 'Nym', 'Orta', 'Phira', 'Qilue', 'Ryba', 'Sylmae', 'Tybae', 'Ula', 'Vanya', 'Wyst', 'Xari', 'Yll', 'Zin',
        ],
        'Dwarf' => [
            'Ironforge', 'Stonehammer', 'Deepvein', 'Copperbeard', 'Goldenshield', 'Anvil', 'Battlehammer', 'Boulderback', 'Cragdelve', 'Darkmine', 'Fireforge', 'Granitehand', 'Helmcleaver', 'Strongpick', 'Tunnelshaper', 'Balderk', 'Dankil', 'Gorunn', 'Holderhek', 'Loderr', 'Lutgehr', 'Rumnaheim', 'Strakeln', 'Torunn', 'Ungart', 'Bronzebeard', 'Frostaxe', 'Mithrilheart', 'Orebreaker', 'Steelvein',
            'Broadaxe', 'Coldiron', 'Darkiron', 'Everfull', 'Forgefire', 'Gleamstone', 'Hardstone', 'Ironfist', 'Jewelcrafter', 'Koboldbane', 'Lightbringer', 'Mountaindweller', 'Nightminer', 'Oakenshield', 'Pikemaker', 'Quartzminer', 'Rockbreaker', 'Silverbeard', 'Trollslayer', 'Underforge', 'Valiantsword', 'Winebibber', 'Xornfighter', 'Yellowbeard', 'Zealous',
            'Brawnanvil', 'Eversharp', 'Firebeard', 'Gorebad', 'Heavyhand', 'Ironhide', 'Jawbreaker', 'Mudtooth', 'Scarhand', 'Stormgut', 'Thunderfist', 'Gnasher', 'Ripfang', 'Wartooth', 'Doomhowl',
        ],
        'Halfling' => [
            'Goodbarrel', 'Underhill', 'Bramblewood', 'Tealeaf', 'Thorngage', 'Bigheart', 'Bushyfoot', 'Cloverfield', 'Dewdrop', 'Fairbottom', 'Greenhill', 'Honeydew', 'Kettleblack', 'Longbottom', 'Meadowbrook', 'Nettlewick', 'Oldburrow', 'Proudfoot', 'Quickstep', 'Riverbank', 'Shortwick', 'Thistledown', 'Warmhearth', 'Underbough', 'Appleblossom', 'Butterfield', 'Copperkettle', 'Dimshaw', 'Fernsby', 'Hilltopple',
            'Baggins', 'Boffin', 'Bolger', 'Bracegirdle', 'Brandybuck', 'Brownlock', 'Bunce', 'Burrows', 'Chubb', 'Cotton', 'Gamgee', 'Gammidge', 'Gardner', 'Goldworthy', 'Goodbody', 'Goodchild', 'Goold', 'Greenhand', 'Grubb', 'Hayward', 'Headstrong', 'Hornblower', 'Maggot', 'Noakes', 'North-Tooks', 'Peat', 'Puddifoot', 'Roper', 'Rumble', 'Sackville', 'Sackville-Baggins', 'Stoor', 'Straith', 'Took', 'Twofoot', 'Whitfoot',
        ],
        'Gnome' => [
            'Sparkgear', 'Tinkerfuse', 'Cogswell', 'Fizzlebang', 'Wizzlepop', 'Beren', 'Daergel', 'Folkor', 'Garrick', 'Murnig', 'Ningel', 'Raulnor', 'Scheppen', 'Turen', 'Wobblecrank', 'Gearsprocket', 'Buttonbright', 'Clockwhir', 'Dimplebottom', 'Fiddlesting', 'Glittergadget', 'Ironspring', 'Jinglebell', 'Knobtwist', 'Leverworth', 'Nackle', 'Pocketnose', 'Quickfinger', 'Seherenin',
            'Boddynock', 'Brocc', 'Burgell', 'Dimble', 'Eldon', 'Erky', 'Fonkin', 'Frug', 'Gerbo', 'Gimble', 'Glim', 'Jebeddo', 'Kellen', 'Namfoodle', 'Orryn', 'Roondar', 'Seebo', 'Sindri', 'Warryn', 'Wrenn', 'Zook',
            'Aleslosh', 'Ashhearth', 'Badger', 'Cloak', 'Doublelock', 'Filchbatter', 'Fnipper', 'Ku', 'Nim', 'Puck',
        ],
        'Half-Elf' => [
            'Silverwood', 'Greenleaf', 'Dawnstrider', 'Moonvale', 'Starling', 'Ashworth', 'Brightleaf', 'Clearbrook', 'Duskwalker', 'Evenfall', 'Fernwind', 'Hawkwood', 'Mistborne', 'Nightvale', 'Oakenhart', 'Ravenswood', 'Shadowmere', 'Thornbloom', 'Willowmere', 'Wyndhaven',
            'Arendel', 'Beleren', 'Cael', 'Dael', 'Erael', 'Fael', 'Gael', 'Hael', 'Irael', 'Jael', 'Kael', 'Lael', 'Mael', 'Nael', 'Orael', 'Pael', 'Qael', 'Rael', 'Sael', 'Tael', 'Urael', 'Vael', 'Wael', 'Xael', 'Yael', 'Zael',
            'Amandar', 'Beriand', 'Caelond', 'Doron', 'Elmir', 'Faldir', 'Gilmar', 'Halar', 'Idril', 'Jaldir', 'Kaldor', 'Lemar', 'Maldor', 'Nandor', 'Oromar', 'Peldir', 'Quendir', 'Raldor', 'Sandor', 'Taldor', 'Umbar', 'Valdir', 'Waldor', 'Xandar', 'Yaldor', 'Zandar',
        ],
        'Half-Orc' => [
            'Gashfang', 'Skullsplitter', 'Ironjaw', 'Bloodtusk', 'Bonecrusher', 'Brokenfist', 'Darkhide', 'Flamescale', 'Goretooth', 'Heavyhand', 'Ironhide', 'Jawbreaker', 'Mudtooth', 'Scarhand', 'Stormgut', 'Thunderfist', 'Gnasher', 'Ripfang', 'Wartooth', 'Doomhowl',
            'Aardvark', 'Barg', 'Carg', 'Darg', 'Farg', 'Garg', 'Harg', 'Jarg', 'Karg', 'Larg', 'Marg', 'Narg', 'Parg', 'Qarg', 'Rarg', 'Sarg', 'Targ', 'Varg', 'Warg', 'Xarg', 'Yarg', 'Zarg',
            'Brute', 'Crush', 'Destroyer', 'Executioner', 'Fierce', 'Grim', 'Harsh', 'Iron', 'Juggernaut', 'Killer', 'Lethal', 'Merciless', 'Nightmare', 'Ogre', 'Punisher', 'Quake', 'Rage', 'Savage', 'Terror', 'Ugly', 'Vicious', 'Wrath', 'Xtreme', 'Yell', 'Zealot',
        ],
    ];`;

let content = fs.readFileSync('roster_generator.php', 'utf-8');

let startIndexFirst = content.indexOf("    $pools = [\n        'Human'");
if (startIndexFirst === -1) startIndexFirst = content.indexOf("    $pools = [\\n        'Human'");
let endIndexFirst = content.indexOf("    // Default fallback for unknown/custom races", startIndexFirst);

let startIndexSur = content.indexOf("    $pools = [\n        'Human'", endIndexFirst);
if (startIndexSur === -1) startIndexSur = content.indexOf("    $pools = [\\n        'Human'", endIndexFirst);
let endIndexSur = content.indexOf("    // Handle unknown races: try partial match", startIndexSur);

if (startIndexFirst > -1 && endIndexFirst > -1 && startIndexSur > -1 && endIndexSur > -1) {
    let newContent = content.substring(0, startIndexFirst) + pools_first + "\\n\\n" + content.substring(endIndexFirst, startIndexSur) + pools_sur + "\\n\\n" + content.substring(endIndexSur);
    fs.writeFileSync('roster_generator.php', newContent, 'utf-8');
    console.log("Updated roster_generator.php");
} else {
    console.log("Could not find blocks");
}
