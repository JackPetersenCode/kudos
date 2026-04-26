namespace Kudos.Server.Services
{
    public static class UsCities
    {
        public static readonly (string City, string State)[] All =
        [
            // Texas
            ("Houston", "TX"), ("San Antonio", "TX"), ("Dallas", "TX"), ("Austin", "TX"),
            ("Fort Worth", "TX"), ("El Paso", "TX"), ("Arlington", "TX"), ("Corpus Christi", "TX"),
            ("Plano", "TX"), ("Lubbock", "TX"), ("Laredo", "TX"), ("Irving", "TX"),
            ("Garland", "TX"), ("Frisco", "TX"), ("McKinney", "TX"), ("Amarillo", "TX"),
            ("Grand Prairie", "TX"), ("Brownsville", "TX"), ("Killeen", "TX"), ("Pasadena", "TX"),
            ("Midland", "TX"), ("McAllen", "TX"), ("Denton", "TX"), ("Waco", "TX"),
            ("Round Rock", "TX"), ("Odessa", "TX"), ("Abilene", "TX"), ("Beaumont", "TX"),
            ("Tyler", "TX"), ("College Station", "TX"), ("San Marcos", "TX"), ("New Braunfels", "TX"),

            // California
            ("Los Angeles", "CA"), ("San Diego", "CA"), ("San Jose", "CA"), ("San Francisco", "CA"),
            ("Fresno", "CA"), ("Sacramento", "CA"), ("Long Beach", "CA"), ("Oakland", "CA"),
            ("Bakersfield", "CA"), ("Anaheim", "CA"), ("Santa Ana", "CA"), ("Riverside", "CA"),
            ("Stockton", "CA"), ("Irvine", "CA"), ("Chula Vista", "CA"), ("Fremont", "CA"),
            ("San Bernardino", "CA"), ("Modesto", "CA"), ("Moreno Valley", "CA"), ("Fontana", "CA"),
            ("Glendale", "CA"), ("Huntington Beach", "CA"), ("Santa Clarita", "CA"), ("Garden Grove", "CA"),
            ("Oceanside", "CA"), ("Rancho Cucamonga", "CA"), ("Ontario", "CA"), ("Santa Rosa", "CA"),
            ("Elk Grove", "CA"), ("Pasadena", "CA"), ("Hayward", "CA"), ("Corona", "CA"),
            ("Salinas", "CA"), ("Palmdale", "CA"), ("Pomona", "CA"), ("Escondido", "CA"),
            ("Sunnyvale", "CA"), ("Torrance", "CA"), ("Roseville", "CA"), ("Visalia", "CA"),
            ("Concord", "CA"), ("Santa Clara", "CA"), ("Thousand Oaks", "CA"), ("Simi Valley", "CA"),

            // Florida
            ("Jacksonville", "FL"), ("Miami", "FL"), ("Tampa", "FL"), ("Orlando", "FL"),
            ("St. Petersburg", "FL"), ("Hialeah", "FL"), ("Port St. Lucie", "FL"), ("Tallahassee", "FL"),
            ("Cape Coral", "FL"), ("Fort Lauderdale", "FL"), ("Pembroke Pines", "FL"), ("Hollywood", "FL"),
            ("Gainesville", "FL"), ("Miramar", "FL"), ("Coral Springs", "FL"), ("Clearwater", "FL"),
            ("Palm Bay", "FL"), ("Lakeland", "FL"), ("Pompano Beach", "FL"), ("West Palm Beach", "FL"),
            ("Davie", "FL"), ("Boca Raton", "FL"), ("Deltona", "FL"), ("Sunrise", "FL"),
            ("Fort Myers", "FL"), ("Kissimmee", "FL"), ("Sarasota", "FL"), ("Ocala", "FL"),
            ("Daytona Beach", "FL"), ("Naples", "FL"), ("Pensacola", "FL"),

            // New York
            ("New York", "NY"), ("Buffalo", "NY"), ("Rochester", "NY"), ("Yonkers", "NY"),
            ("Syracuse", "NY"), ("Albany", "NY"), ("New Rochelle", "NY"), ("Mount Vernon", "NY"),
            ("Schenectady", "NY"), ("Utica", "NY"), ("White Plains", "NY"),

            // Illinois
            ("Chicago", "IL"), ("Aurora", "IL"), ("Rockford", "IL"), ("Joliet", "IL"),
            ("Naperville", "IL"), ("Springfield", "IL"), ("Peoria", "IL"), ("Elgin", "IL"),
            ("Champaign", "IL"), ("Evanston", "IL"), ("Bloomington", "IL"), ("Decatur", "IL"),

            // Pennsylvania
            ("Philadelphia", "PA"), ("Pittsburgh", "PA"), ("Allentown", "PA"), ("Reading", "PA"),
            ("Erie", "PA"), ("Scranton", "PA"), ("Bethlehem", "PA"), ("Lancaster", "PA"),
            ("Harrisburg", "PA"),

            // Ohio
            ("Columbus", "OH"), ("Cleveland", "OH"), ("Cincinnati", "OH"), ("Toledo", "OH"),
            ("Akron", "OH"), ("Dayton", "OH"), ("Canton", "OH"), ("Youngstown", "OH"),

            // Georgia
            ("Atlanta", "GA"), ("Augusta", "GA"), ("Columbus", "GA"), ("Savannah", "GA"),
            ("Athens", "GA"), ("Macon", "GA"), ("Roswell", "GA"), ("Sandy Springs", "GA"),

            // North Carolina
            ("Charlotte", "NC"), ("Raleigh", "NC"), ("Greensboro", "NC"), ("Durham", "NC"),
            ("Winston-Salem", "NC"), ("Fayetteville", "NC"), ("Cary", "NC"), ("Wilmington", "NC"),
            ("High Point", "NC"), ("Asheville", "NC"), ("Concord", "NC"), ("Chapel Hill", "NC"),

            // Michigan
            ("Detroit", "MI"), ("Grand Rapids", "MI"), ("Warren", "MI"), ("Sterling Heights", "MI"),
            ("Ann Arbor", "MI"), ("Lansing", "MI"), ("Flint", "MI"), ("Dearborn", "MI"),
            ("Kalamazoo", "MI"),

            // New Jersey
            ("Newark", "NJ"), ("Jersey City", "NJ"), ("Paterson", "NJ"), ("Elizabeth", "NJ"),
            ("Trenton", "NJ"), ("Camden", "NJ"), ("Clifton", "NJ"),

            // Virginia
            ("Virginia Beach", "VA"), ("Norfolk", "VA"), ("Chesapeake", "VA"), ("Richmond", "VA"),
            ("Newport News", "VA"), ("Alexandria", "VA"), ("Hampton", "VA"), ("Roanoke", "VA"),
            ("Lynchburg", "VA"), ("Charlottesville", "VA"),

            // Washington
            ("Seattle", "WA"), ("Spokane", "WA"), ("Tacoma", "WA"), ("Vancouver", "WA"),
            ("Bellevue", "WA"), ("Kent", "WA"), ("Everett", "WA"), ("Renton", "WA"),
            ("Olympia", "WA"), ("Bellingham", "WA"),

            // Arizona
            ("Phoenix", "AZ"), ("Tucson", "AZ"), ("Mesa", "AZ"), ("Chandler", "AZ"),
            ("Scottsdale", "AZ"), ("Glendale", "AZ"), ("Gilbert", "AZ"), ("Tempe", "AZ"),
            ("Peoria", "AZ"), ("Surprise", "AZ"), ("Flagstaff", "AZ"),

            // Massachusetts
            ("Boston", "MA"), ("Worcester", "MA"), ("Springfield", "MA"), ("Cambridge", "MA"),
            ("Lowell", "MA"), ("Brockton", "MA"), ("New Bedford", "MA"), ("Quincy", "MA"),
            ("Lynn", "MA"), ("Fall River", "MA"), ("Somerville", "MA"),

            // Tennessee
            ("Nashville", "TN"), ("Memphis", "TN"), ("Knoxville", "TN"), ("Chattanooga", "TN"),
            ("Clarksville", "TN"), ("Murfreesboro", "TN"), ("Franklin", "TN"),

            // Indiana
            ("Indianapolis", "IN"), ("Fort Wayne", "IN"), ("Evansville", "IN"), ("South Bend", "IN"),
            ("Carmel", "IN"), ("Fishers", "IN"), ("Bloomington", "IN"), ("Lafayette", "IN"),

            // Missouri
            ("Kansas City", "MO"), ("St. Louis", "MO"), ("Springfield", "MO"), ("Columbia", "MO"),
            ("Independence", "MO"), ("Lee's Summit", "MO"),

            // Maryland
            ("Baltimore", "MD"), ("Frederick", "MD"), ("Rockville", "MD"), ("Gaithersburg", "MD"),
            ("Bowie", "MD"), ("Annapolis", "MD"),

            // Wisconsin
            ("Milwaukee", "WI"), ("Madison", "WI"), ("Green Bay", "WI"), ("Kenosha", "WI"),
            ("Racine", "WI"), ("Appleton", "WI"),

            // Colorado
            ("Denver", "CO"), ("Colorado Springs", "CO"), ("Aurora", "CO"), ("Fort Collins", "CO"),
            ("Lakewood", "CO"), ("Thornton", "CO"), ("Arvada", "CO"), ("Boulder", "CO"),
            ("Pueblo", "CO"), ("Westminster", "CO"),

            // Minnesota
            ("Minneapolis", "MN"), ("St. Paul", "MN"), ("Rochester", "MN"), ("Duluth", "MN"),
            ("Bloomington", "MN"), ("Brooklyn Park", "MN"), ("Plymouth", "MN"),

            // South Carolina
            ("Charleston", "SC"), ("Columbia", "SC"), ("North Charleston", "SC"),
            ("Greenville", "SC"), ("Mount Pleasant", "SC"), ("Rock Hill", "SC"),

            // Alabama
            ("Birmingham", "AL"), ("Montgomery", "AL"), ("Huntsville", "AL"), ("Mobile", "AL"),
            ("Tuscaloosa", "AL"),

            // Louisiana
            ("New Orleans", "LA"), ("Baton Rouge", "LA"), ("Shreveport", "LA"), ("Lafayette", "LA"),
            ("Lake Charles", "LA"),

            // Kentucky
            ("Louisville", "KY"), ("Lexington", "KY"), ("Bowling Green", "KY"),
            ("Owensboro", "KY"), ("Covington", "KY"),

            // Oregon
            ("Portland", "OR"), ("Salem", "OR"), ("Eugene", "OR"), ("Gresham", "OR"),
            ("Hillsboro", "OR"), ("Beaverton", "OR"), ("Bend", "OR"), ("Medford", "OR"),

            // Oklahoma
            ("Oklahoma City", "OK"), ("Tulsa", "OK"), ("Norman", "OK"), ("Broken Arrow", "OK"),
            ("Edmond", "OK"), ("Lawton", "OK"),

            // Connecticut
            ("Bridgeport", "CT"), ("New Haven", "CT"), ("Stamford", "CT"), ("Hartford", "CT"),
            ("Waterbury", "CT"), ("Norwalk", "CT"), ("Danbury", "CT"),

            // Iowa
            ("Des Moines", "IA"), ("Cedar Rapids", "IA"), ("Davenport", "IA"),
            ("Sioux City", "IA"), ("Iowa City", "IA"), ("Waterloo", "IA"),

            // Utah
            ("Salt Lake City", "UT"), ("West Valley City", "UT"), ("Provo", "UT"),
            ("West Jordan", "UT"), ("Orem", "UT"), ("Sandy", "UT"), ("Ogden", "UT"),
            ("St. George", "UT"), ("Layton", "UT"),

            // Nevada
            ("Las Vegas", "NV"), ("Henderson", "NV"), ("Reno", "NV"), ("North Las Vegas", "NV"),
            ("Sparks", "NV"), ("Carson City", "NV"),

            // Arkansas
            ("Little Rock", "AR"), ("Fort Smith", "AR"), ("Fayetteville", "AR"),
            ("Springdale", "AR"), ("Jonesboro", "AR"),

            // Kansas
            ("Wichita", "KS"), ("Overland Park", "KS"), ("Kansas City", "KS"),
            ("Olathe", "KS"), ("Topeka", "KS"), ("Lawrence", "KS"),

            // Mississippi
            ("Jackson", "MS"), ("Gulfport", "MS"), ("Southaven", "MS"), ("Hattiesburg", "MS"),
            ("Biloxi", "MS"),

            // Nebraska
            ("Omaha", "NE"), ("Lincoln", "NE"), ("Bellevue", "NE"),

            // New Mexico
            ("Albuquerque", "NM"), ("Las Cruces", "NM"), ("Rio Rancho", "NM"),
            ("Santa Fe", "NM"), ("Roswell", "NM"),

            // Idaho
            ("Boise", "ID"), ("Meridian", "ID"), ("Nampa", "ID"), ("Idaho Falls", "ID"),
            ("Pocatello", "ID"), ("Caldwell", "ID"),

            // Hawaii
            ("Honolulu", "HI"),

            // West Virginia
            ("Charleston", "WV"), ("Huntington", "WV"), ("Morgantown", "WV"),

            // New Hampshire
            ("Manchester", "NH"), ("Nashua", "NH"), ("Concord", "NH"),

            // Maine
            ("Portland", "ME"), ("Lewiston", "ME"), ("Bangor", "ME"),

            // Montana
            ("Billings", "MT"), ("Missoula", "MT"), ("Great Falls", "MT"), ("Bozeman", "MT"),

            // Rhode Island
            ("Providence", "RI"), ("Warwick", "RI"), ("Cranston", "RI"),

            // Delaware
            ("Wilmington", "DE"), ("Dover", "DE"), ("Newark", "DE"),

            // South Dakota
            ("Sioux Falls", "SD"), ("Rapid City", "SD"),

            // North Dakota
            ("Fargo", "ND"), ("Bismarck", "ND"), ("Grand Forks", "ND"),

            // Alaska
            ("Anchorage", "AK"), ("Fairbanks", "AK"), ("Juneau", "AK"),

            // Vermont
            ("Burlington", "VT"), ("South Burlington", "VT"),

            // Wyoming
            ("Cheyenne", "WY"), ("Casper", "WY"), ("Laramie", "WY"),

            // Washington DC
            ("Washington", "DC"),
        ];
    }
}
