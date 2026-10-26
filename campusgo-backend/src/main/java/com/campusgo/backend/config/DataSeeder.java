package com.campusgo.backend.config;

import com.campusgo.backend.models.*;
import com.campusgo.backend.repositories.DeliveryAgentRepository;
import com.campusgo.backend.repositories.DeliveryApplicationRepository;
import com.campusgo.backend.repositories.ProductRepository;
import com.campusgo.backend.repositories.ShopRepository;
import com.campusgo.backend.repositories.UserRepository;
import com.campusgo.backend.repositories.CampusSettingRepository;
import com.campusgo.backend.repositories.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataSeeder {

        private final UserRepository userRepository;
        private final ShopRepository shopRepository;
        private final ProductRepository productRepository;
        private final PasswordEncoder passwordEncoder;
        private final DeliveryApplicationRepository deliveryApplicationRepository;
        private final DeliveryAgentRepository deliveryAgentRepository;
        private final CampusSettingRepository campusSettingRepository;
        private final ComplaintRepository complaintRepository;

        @Value("${app.seed-demo-data:false}")
        private boolean seedDemoData;

        @Value("${app.demo.admin-password:}")
        private String demoAdminPassword;

        @Value("${app.demo.student-password:}")
        private String demoStudentPassword;

        @Value("${app.demo.agent-password:}")
        private String demoAgentPassword;

	/**
	/**
	 * Moves any legacy delivery center to Anurag University, Hyderabad.
	 * This runs independently of demo-data seeding so an existing production
	 * database is corrected on its next backend restart.
	 */
	@Bean
	public CommandLineRunner migrateRetiredCampusLocation() {
		return args -> {
			var latitude = campusSettingRepository.findBySettingKey("campus.latitude");
			var longitude = campusSettingRepository.findBySettingKey("campus.longitude");
			var campusName = campusSettingRepository.findBySettingKey("campus_name");
			boolean usesRetiredCenter = latitude.map(s -> "17.4018".equals(s.getSettingValue()) || "17.92119444".equals(s.getSettingValue())).orElse(false)
					|| longitude.map(s -> "78.5602".equals(s.getSettingValue()) || "79.85761111".equals(s.getSettingValue())).orElse(false)
					|| campusName.map(s -> s.getSettingValue() != null && !s.getSettingValue().contains("Anurag")).orElse(false);

			if (!usesRetiredCenter) return;

			latitude.ifPresent(s -> {
				s.setSettingValue("17.41931");
				campusSettingRepository.save(s);
			});
			longitude.ifPresent(s -> {
				s.setSettingValue("78.65654");
				campusSettingRepository.save(s);
			});
			campusName.ifPresent(s -> {
				s.setSettingValue("Anurag University, Hyderabad");
				campusSettingRepository.save(s);
			});
			log.info("Migrated CampusGo delivery center to Anurag University, Hyderabad");
		};
	}

        @Bean
        public CommandLineRunner initData() {
                return args -> {
			if (seedDemoData) {
				requireDemoPasswords();
                        // Ensure Manager accounts always exist with correct password & role
                        userRepository.findByEmail("manager@anurag.edu.in").ifPresentOrElse(m -> {
                            m.setPassword(passwordEncoder.encode(demoAdminPassword));
                            m.setRole(Role.ADMIN);
                            m.setActive(true);
                            userRepository.save(m);
                        }, () -> {
                            User managerEdu = User.builder()
                                    .name("Admin Manager")
                                    .email("manager@anurag.edu.in")
                                    .password(passwordEncoder.encode(demoAdminPassword))
                                    .roles(new HashSet<>(Set.of(Role.ADMIN)))
                                    .active(true)
                                    .build();
                            userRepository.save(managerEdu);
                        });

                        userRepository.findByEmail("manager@campusgo.com").ifPresentOrElse(m -> {
                            m.setPassword(passwordEncoder.encode(demoAdminPassword));
                            m.setRole(Role.ADMIN);
                            m.setActive(true);
                            userRepository.save(m);
                        }, () -> {
                            User manager = User.builder()
                                    .name("Admin Manager")
                                    .email("manager@campusgo.com")
                                    .password(passwordEncoder.encode(demoAdminPassword))
                                    .roles(new HashSet<>(Set.of(Role.ADMIN)))
                                    .active(true)
                                    .build();
                            userRepository.save(manager);
                        });

                        // Ensure Student exists
                        if (userRepository.findByEmail("23eg106c27@anurag.edu.in").isEmpty()) {
                            User student = User.builder()
                                    .name("John Student")
                                    .email("23eg106c27@anurag.edu.in")
                                    .password(passwordEncoder.encode(demoStudentPassword))
                                    .roles(new HashSet<>(Set.of(Role.STUDENT)))
                                    .active(true)
                                    .build();
                            userRepository.save(student);
                        }

                        // Ensure Delivery Agents exist
                        userRepository.findByEmail("agent@anurag.edu.in").ifPresentOrElse(a -> {
                            a.setPassword(passwordEncoder.encode(demoAgentPassword));
                            a.setRole(Role.DELIVERY_PARTNER);
                            a.setActive(true);
                            userRepository.save(a);
                        }, () -> {
                            User agentEdu = User.builder()
                                    .name("Raju Deliveries")
                                    .email("agent@anurag.edu.in")
                                    .password(passwordEncoder.encode(demoAgentPassword))
                                    .roles(new HashSet<>(Set.of(Role.STUDENT, Role.DELIVERY_PARTNER)))
                                    .active(true)
                                    .build();
                            userRepository.save(agentEdu);
                        });

                        userRepository.findByEmail("agent@campusgo.com").ifPresentOrElse(a -> {
                            a.setPassword(passwordEncoder.encode(demoAgentPassword));
                            a.setRole(Role.DELIVERY_PARTNER);
                            a.setActive(true);
                            userRepository.save(a);
                        }, () -> {
                            User agent = User.builder()
                                    .name("Raju Deliveries")
                                    .email("agent@campusgo.com")
                                    .password(passwordEncoder.encode(demoAgentPassword))
                                    .roles(new HashSet<>(Set.of(Role.STUDENT, Role.DELIVERY_PARTNER)))
                                    .active(true)
                                    .build();
                            userRepository.save(agent);
                        });

                        if (deliveryApplicationRepository.count() == 0) {
                                log.info("Seeding initial delivery partner applications...");
                                userRepository.findByEmail("agent@campusgo.com").ifPresent(agentUser -> {
                                        DeliveryPartnerApplication app = DeliveryPartnerApplication.builder()
                                                        .user(agentUser)
                                                        .applicantType(ApplicantType.STUDENT)
                                                        .status(ApplicationStatus.APPROVED)
                                                        .studentIdCardPath("seed_student_id.jpg")
                                                        .timetablePath("seed_timetable.jpg")
                                                        .profilePhotoPath("seed_profile.jpg")
                                                        .submittedAt(LocalDateTime.now().minusDays(3))
                                                        .reviewedAt(LocalDateTime.now().minusDays(2))
                                                        .studentAvailability("{\"Monday\":[\"2:00 PM – 4:00 PM\",\"5:00 PM – 7:00 PM\"]}")
                                                        .build();
                                        deliveryApplicationRepository.save(app);

                                        if (deliveryAgentRepository.findByUserId(agentUser.getId()).isEmpty()) {
                                                DeliveryAgent agent = DeliveryAgent.builder()
                                                                .user(agentUser)
                                                                .availabilityStatus("AVAILABLE")
                                                                .partnerStatus("INACTIVE")
                                                                .build();
                                                deliveryAgentRepository.save(agent);
                                        }
                                });

                                // Clean up demo application from 23eg106c27@anurag.edu.in so student can test fresh registration
                                userRepository.findByEmail("23eg106c27@anurag.edu.in").ifPresent(studentUser -> {
                                        deliveryApplicationRepository.findByUserIdOrderByCreatedAtDesc(studentUser.getId()).forEach(app -> {
                                                if ("demo_student_id.jpg".equals(app.getStudentIdCardPath())) {
                                                        deliveryApplicationRepository.delete(app);
                                                        log.info("Cleaned up seeded demo pending application for 23eg106c27@anurag.edu.in");
                                                }
                                        });
                                });

                                // Seed demo pending application for separate Demo Applicant for manager testing
                                if (userRepository.findByEmail("demo.applicant@anurag.edu.in").isEmpty()) {
                                        User demoApplicant = User.builder()
                                                        .name("Rahul Verma")
                                                        .email("demo.applicant@anurag.edu.in")
                                                        .password(passwordEncoder.encode(demoStudentPassword))
                                                        .roles(new HashSet<>(Set.of(Role.STUDENT)))
                                                        .active(true)
                                                        .build();
                                        userRepository.save(demoApplicant);

                                        DeliveryPartnerApplication pendingApp = DeliveryPartnerApplication.builder()
                                                        .user(demoApplicant)
                                                        .applicantType(ApplicantType.STUDENT)
                                                        .status(ApplicationStatus.PENDING)
                                                        .studentIdCardPath("demo_student_id.jpg")
                                                        .timetablePath("demo_timetable.jpg")
                                                        .profilePhotoPath("demo_selfie.jpg")
                                                        .submittedAt(LocalDateTime.now().minusHours(4))
                                                        .studentAvailability("{\"Tuesday\":[\"3:00 PM – 6:00 PM\"]}")
                                                        .build();
					deliveryApplicationRepository.save(pendingApp);
				}
			}

			}

			seedCampusShopInventory();

			if (shopRepository.count() == 0) {
                                log.info("Seeding initial shops...");
                                com.campusgo.backend.models.Shop canteen = com.campusgo.backend.models.Shop.builder()
                                                .name("Campus Canteen")
                                                .category("Meals")
                                                .description("Hot meals, noodles, fast food and snacks")
                                                .open(true)
                                                .active(true)
                                                .preparationTime(12)
                                                .rating(4.7)
                                                .imageUrl("https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80")
                                                .build();
                                shopRepository.save(canteen);

                                com.campusgo.backend.models.Shop cafe = com.campusgo.backend.models.Shop.builder()
                                                .name("Library Cafe")
                                                .category("Drinks")
                                                .description("Chilled beverages, coffee, tea, and quick bites")
                                                .open(true)
                                                .active(true)
                                                .preparationTime(8)
                                                .rating(4.6)
                                                .imageUrl("https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=900&q=80")
                                                .build();
                                shopRepository.save(cafe);
                        }

                        if (productRepository.count() == 0) {
                                log.info("Seeding initial products with multiple categories...");
                                com.campusgo.backend.models.Shop canteen = shopRepository.findAll().stream()
                                                .filter(s -> s.getName().contains("Canteen"))
                                                .findFirst()
                                                .orElseGet(() -> shopRepository.findAll().get(0));

                                com.campusgo.backend.models.Shop cafe = shopRepository.findAll().stream()
                                                .filter(s -> s.getName().contains("Cafe"))
                                                .findFirst()
                                                .orElse(canteen);

                                // MEALS
                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(canteen)
                                                .name("Veg Biryani Box")
                                                .category("Meals")
                                                .description("Aromatic basmati rice, spiced veggies, raita and salad")
                                                .price(java.math.BigDecimal.valueOf(120.00))
                                                .imageUrl("https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=900&q=80")
                                                .available(true)
                                                .active(true)
                                                .build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(canteen)
                                                .name("Chicken Dum Biryani")
                                                .category("Meals")
                                                .description("Flavorful spiced rice with tender chicken piece, mirchi ka salan")
                                                .price(java.math.BigDecimal.valueOf(160.00))
                                                .imageUrl("https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=900&q=80")
                                                .available(true)
                                                .active(true)
                                                .build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(canteen)
                                                .name("Special Veg Thali")
                                                .category("Meals")
                                                .description("2 Rotis, Paneer butter masala, Dal fry, Rice, and Sweet")
                                                .price(java.math.BigDecimal.valueOf(140.00))
                                                .imageUrl("https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?auto=format&fit=crop&w=900&q=80")
                                                .available(true)
                                                .active(true)
                                                .build());

                                // DRINKS
                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(cafe)
                                                .name("Cold Coffee")
                                                .category("Drinks")
                                                .description("Creamy chilled iced coffee for study breaks")
                                                .price(java.math.BigDecimal.valueOf(70.00))
                                                .imageUrl("https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=900&q=80")
                                                .available(true)
                                                .active(true)
                                                .build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(cafe)
                                                .name("Fresh Lime Soda")
                                                .category("Drinks")
                                                .description("Refreshing sweet and salted chilled lime soda")
                                                .price(java.math.BigDecimal.valueOf(45.00))
                                                .imageUrl("https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80")
                                                .available(true)
                                                .active(true)
                                                .build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(cafe)
                                                .name("Masala Chai")
                                                .category("Drinks")
                                                .description("Hot brewed ginger cardamom cutting tea")
                                                .price(java.math.BigDecimal.valueOf(20.00))
                                                .imageUrl("https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80")
                                                .available(true)
                                                .active(true)
                                                .build());

                                // SNACKS
                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(canteen)
                                                .name("Crispy French Fries")
                                                .category("Snacks")
                                                .description("Golden salted fries packed hot with dip")
                                                .price(java.math.BigDecimal.valueOf(65.00))
                                                .imageUrl("https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=900&q=80")
                                                .available(true)
                                                .active(true)
                                                .build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(canteen)
                                                .name("Hot Samosa (2 pcs)")
                                                .category("Snacks")
                                                .description("Crispy spiced potato pastry served with green mint chutney")
                                                .price(java.math.BigDecimal.valueOf(35.00))
                                                .imageUrl("https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80")
                                                .available(true)
                                                .active(true)
                                                .build());

                                // FAST FOOD
                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(canteen)
                                                .name("Paneer Wrap")
                                                .category("Fast Food")
                                                .description("Soft wrap with grilled paneer, onions and mint mayo")
                                                .price(java.math.BigDecimal.valueOf(89.00))
                                                .imageUrl("https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=900&q=80")
                                                .available(true)
                                                .active(true)
                                                .build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(canteen)
                                                .name("Veg Cheese Burger")
                                                .category("Fast Food")
                                                .description("Crisp vegetable patty with melted cheese slice and sauce")
                                                .price(java.math.BigDecimal.valueOf(95.00))
                                                .imageUrl("https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80")
                                                .available(true)
                                                .active(true)
                                                .build());

                                // MAGGI & NOODLES
                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(canteen)
                                                .name("Cheese Maggi Bowl")
                                                .category("Maggi & Noodles")
                                                .description("Hot classic noodles with melted cheese and campus spices")
                                                .price(java.math.BigDecimal.valueOf(55.00))
                                                .imageUrl("https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=900&q=80")
                                                .available(true)
                                                .active(true)
                                                .build());

                                // STATIONERY
                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(cafe)
                                                .name("Campus Stationery Kit")
                                                .category("Stationery")
                                                .description("Gel pens (blue, black), sticky notes, and ruled notepad")
                                                .price(java.math.BigDecimal.valueOf(99.00))
                                                .imageUrl("https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=900&q=80")
                                                .available(true)
                                                .active(true)
                                                .build());

                                log.info("Data seeding completed with {} products.", productRepository.count());
                        }

                        // Ensure quick-commerce categories are present in database
                        if (productRepository.findAll().stream().noneMatch(p -> p.getName().contains("Lays"))) {
                                log.info("Seeding Blinkit/Instamart quick-commerce products...");
                                com.campusgo.backend.models.Shop canteen = shopRepository.findAll().stream()
                                                .filter(s -> s.getName().contains("Canteen"))
                                                .findFirst()
                                                .orElseGet(() -> shopRepository.findAll().get(0));

                                com.campusgo.backend.models.Shop cafe = shopRepository.findAll().stream()
                                                .filter(s -> s.getName().contains("Cafe"))
                                                .findFirst()
                                                .orElse(canteen);

                                // SNACKS
                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(canteen).name("Lays Magic Masala (50g)").category("Snacks")
                                                .description("Spicy ridged potato chips with authentic Indian spices")
                                                .price(java.math.BigDecimal.valueOf(20.00))
                                                .imageUrl("https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(canteen).name("Bingo Mad Angles Achaari Masti").category("Snacks")
                                                .description("Crispy triangle chips bursting with tangy mango pickle flavor")
                                                .price(java.math.BigDecimal.valueOf(20.00))
                                                .imageUrl("https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(canteen).name("Kurkure Masala Munch (75g)").category("Snacks")
                                                .description("Crunchy tedhe-medhe snacks packed with spicy flavor")
                                                .price(java.math.BigDecimal.valueOf(20.00))
                                                .imageUrl("https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(canteen).name("Doritos Nacho Cheese").category("Snacks")
                                                .description("Bold nacho cheese seasoned crispy corn tortilla chips")
                                                .price(java.math.BigDecimal.valueOf(30.00))
                                                .imageUrl("https://images.unsplash.com/photo-1512152272829-e3139592d56f?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(canteen).name("Uncle Chipps Spicy Treat").category("Snacks")
                                                .description("Classic salted and spiced crinkle cut potato wafers")
                                                .price(java.math.BigDecimal.valueOf(20.00))
                                                .imageUrl("https://images.unsplash.com/photo-1527842891421-42eec6e703ea?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

                                // BEVERAGES
                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(cafe).name("Coca Cola Can (250ml)").category("Beverages")
                                                .description("Chilled sparkling refreshing cola soda can")
                                                .price(java.math.BigDecimal.valueOf(40.00))
                                                .imageUrl("https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(cafe).name("Frooti Fresh Mango Drink").category("Beverages")
                                                .description("Classic real mango pulp drink in chilled tetrapack")
                                                .price(java.math.BigDecimal.valueOf(25.00))
                                                .imageUrl("https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

                                // CHOCOLATES
                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(cafe).name("Cadbury Dairy Milk Silk (60g)").category("Chocolates")
                                                .description("Melt-in-mouth smooth milk chocolate bar")
                                                .price(java.math.BigDecimal.valueOf(80.00))
                                                .imageUrl("https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(cafe).name("KitKat 4 Finger Chocolate").category("Chocolates")
                                                .description("Crisp wafer fingers covered with smooth milk chocolate")
                                                .price(java.math.BigDecimal.valueOf(30.00))
                                                .imageUrl("https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(cafe).name("Cadbury 5 Star Chocolate").category("Chocolates")
                                                .description("Caramel and nougat filled chocolate bite")
                                                .price(java.math.BigDecimal.valueOf(15.00))
                                                .imageUrl("https://images.unsplash.com/photo-1582293041079-7814c2f12063?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

                                // BISCUITS
                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(canteen).name("Oreo Vanilla Creme Biscuits").category("Biscuits")
                                                .description("Rich dark chocolate cookies with sweet vanilla cream")
                                                .price(java.math.BigDecimal.valueOf(35.00))
                                                .imageUrl("https://images.unsplash.com/photo-1567982047351-76b6f93e38ee?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(canteen).name("Parle-G Gold Glucose Biscuits").category("Biscuits")
                                                .description("India’s favorite tea-time crunchy glucose biscuit")
                                                .price(java.math.BigDecimal.valueOf(20.00))
                                                .imageUrl("https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(canteen).name("Britannia Bourbon Chocolate Cream").category("Biscuits")
                                                .description("Sugar sprinkled crunchy biscuits with chocolate cream")
                                                .price(java.math.BigDecimal.valueOf(30.00))
                                                .imageUrl("https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

                                // FRUITS
                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(cafe).name("Fresh Apple Box (4 pcs)").category("Fruits")
                                                .description("Crisp, sweet Washington red apples washed and packed")
                                                .price(java.math.BigDecimal.valueOf(90.00))
                                                .imageUrl("https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(cafe).name("Fresh Robusta Bananas (6 pcs)").category("Fruits")
                                                .description("Naturally ripened sweet bananas, ideal for study energy")
                                                .price(java.math.BigDecimal.valueOf(40.00))
                                                .imageUrl("https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

                                // PERSONAL CARE
                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(cafe).name("Dettol Hand Sanitizer (50ml)").category("Personal Care")
                                                .description("Instant pocket sanitizer with 72% alcohol protection")
                                                .price(java.math.BigDecimal.valueOf(35.00))
                                                .imageUrl("https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

                                productRepository.save(com.campusgo.backend.models.Product.builder()
                                                .shop(cafe).name("Soft Pocket Face Tissues (3 packs)").category("Personal Care")
                                                .description("Gentle 3-ply wipes for campus and sports sessions")
                                                .price(java.math.BigDecimal.valueOf(45.00))
                                                .imageUrl("https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=700&q=80")
                                                .available(true).active(true).build());

				// Seed initial campus settings or ensure Anurag University, Hyderabad coordinates are configured
				if (campusSettingRepository.count() == 0) {
					campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
							.settingKey("campus_name").settingValue("Anurag University, Hyderabad").description("Official campus and delivery zone name").build());
					campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
							.settingKey("campus.latitude").settingValue("17.41931").description("Center latitude (Anurag University, Hyderabad)").build());
					campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
							.settingKey("campus.longitude").settingValue("78.65654").description("Center longitude (Anurag University, Hyderabad)").build());
					campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
							.settingKey("delivery.radius.meters").settingValue("15000").description("Campus delivery boundary in meters (covers up to Uppal)").build());
					campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
							.settingKey("delivery_fee").settingValue("15").description("Flat delivery fee in INR").build());
					campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
							.settingKey("min_order").settingValue("30").description("Minimum order value in INR").build());
					campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
							.settingKey("geofence_radius").settingValue("15.0").description("Campus delivery boundary in KM").build());
					campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
							.settingKey("operating_hours").settingValue("8:00 AM – 9:00 PM").description("Campus service hours").build());
				} else {
					// Ensure campus latitude/longitude and updated radius exist if seeded previously without them
					campusSettingRepository.findBySettingKey("campus_name").ifPresentOrElse(
							s -> { s.setSettingValue("Anurag University, Hyderabad"); campusSettingRepository.save(s); },
							() -> campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
								.settingKey("campus_name").settingValue("Anurag University, Hyderabad").description("Official campus and delivery zone name").build())
					);
					campusSettingRepository.findBySettingKey("campus.latitude").ifPresentOrElse(
							s -> { s.setSettingValue("17.41931"); campusSettingRepository.save(s); },
							() -> campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
								.settingKey("campus.latitude").settingValue("17.41931").description("Center latitude (Anurag University, Hyderabad)").build())
					);
					campusSettingRepository.findBySettingKey("campus.longitude").ifPresentOrElse(
							s -> { s.setSettingValue("78.65654"); campusSettingRepository.save(s); },
							() -> campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
								.settingKey("campus.longitude").settingValue("78.65654").description("Center longitude (Anurag University, Hyderabad)").build())
					);
					campusSettingRepository.findBySettingKey("delivery.radius.meters").ifPresentOrElse(
							s -> { s.setSettingValue("15000"); campusSettingRepository.save(s); },
							() -> campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
									.settingKey("delivery.radius.meters").settingValue("15000").description("Campus delivery boundary in meters (covers up to Uppal)").build())
					);
					campusSettingRepository.findBySettingKey("geofence_radius").ifPresent(s -> {
						s.setSettingValue("15.0");
						campusSettingRepository.save(s);
					});
				}

				// Seed print pricing settings (idempotent)
				campusSettingRepository.findBySettingKey("print.bw.price_per_page").ifPresentOrElse(
						s -> { /* already set */ },
						() -> campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
								.settingKey("print.bw.price_per_page").settingValue("2")
								.description("Print service: cost per page for Black & White (INR)").build())
				);
				campusSettingRepository.findBySettingKey("print.color.price_per_page").ifPresentOrElse(
						s -> { /* already set */ },
						() -> campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
								.settingKey("print.color.price_per_page").settingValue("5")
								.description("Print service: cost per page for Color printing (INR)").build())
				);
				campusSettingRepository.findBySettingKey("platform.fee").ifPresentOrElse(
						s -> { /* already set */ },
						() -> campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
								.settingKey("platform.fee").settingValue("5")
								.description("CampusGo platform convenience fee charged once per order (INR)").build())
				);
				campusSettingRepository.findBySettingKey("print.max_file_size_mb").ifPresentOrElse(
						s -> { /* already set */ },
						() -> campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
								.settingKey("print.max_file_size_mb").settingValue("20")
								.description("Maximum allowed file upload size in MB for print service").build())
				);
				campusSettingRepository.findBySettingKey("print.supported_formats").ifPresentOrElse(
						s -> { /* already set */ },
						() -> campusSettingRepository.save(com.campusgo.backend.models.CampusSetting.builder()
								.settingKey("print.supported_formats").settingValue(".pdf,.doc,.docx,.ppt,.pptx,.jpg,.png")
								.description("Supported document file extensions for printing").build())
				);

				// Seed sample complaint if not present
				if (complaintRepository.count() == 0) {
					userRepository.findByEmail("23eg106c27@anurag.edu.in").ifPresent(student -> {
						complaintRepository.save(com.campusgo.backend.models.Complaint.builder()
								.user(student)
								.category("DELIVERY")
								.subject("Delayed delivery during hostel hours")
								.description("Order took longer than usual near Block E. Please check delivery partner assigned.")
								.priority("MEDIUM")
								.status("OPEN")
								.build());
					});
				}
			}
		};
	}

	private void seedCampusShopInventory() {
		Shop dBlock = ensureShop(
				"D Block Canteen",
				"Food • Snacks • Beverages",
				"Fast food, puffs, fries, momos, biscuits, chocolates and ice creams from D Block.",
				"D Block",
				"https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=900&q=80",
				12,
				4.7
		);
		Shop iBlock = ensureShop(
				"I Block Canteen",
				"Food • Snacks • Biryani",
				"Puffs, snacks, brownie, biryani, tiffins and juices from I Block.",
				"I Block",
				"https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=900&q=80",
				14,
				4.6
		);
		Shop readers = ensureShop(
				"Readers",
				"Stationery • Snacks",
				"Records, pens, pencils, erasers, stationery essentials and selected snacks.",
				"Readers",
				"https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=900&q=80",
				8,
				4.8
		);

		ensureProduct(dBlock, "Egg Puff", "Fast Food", "Flaky bakery puff filled with spiced egg masala.", 25, 20, "https://www.yummyntasty.com/wp-content/uploads/2015/03/egg-puffs.jpg");
		ensureProduct(dBlock, "Veg Puff", "Fast Food", "Crisp puff filled with mildly spiced vegetables.", 20, 25, "https://floursandfrostings.com/wp-content/uploads/2018/03/IMG_20180306_084523_451.jpg");
		ensureProduct(dBlock, "Samosa", "Fast Food", "Hot potato samosa served with chutney.", 15, 30, "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSrSow8wiUuIxjfEToV69JWVUKXnNmisjibteHRz3SiFsXMpPswQFhS9QQ&s=10");
		ensureProduct(dBlock, "Frankie", "Fast Food", "Campus-style roll with veggie filling and sauces.", 45, 18, "https://www.spiceupthecurry.com/wp-content/uploads/2019/09/frankie-recipe-2-1.jpg");
		ensureProduct(dBlock, "French Fries", "Fast Food", "Crispy salted fries served hot.", 50, 20, "https://www.allrecipes.com/thmb/8_B6OD1w6h1V0zPi8KAGzD41Kzs=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/50223-homemade-crispy-seasoned-french-fries-VAT-Beauty-4x3-789ecb2eaed34d6e879b9a93dd56a50a.jpg");
		ensureProduct(dBlock, "Momos", "Fast Food", "Steamed momos with spicy chutney.", 50, 15, "https://static.toiimg.com/thumb/53281477.cms?imgsize=1884587&width=800&height=800");
		ensureProduct(dBlock, "Ice Creams", "Ice Creams", "Assorted chilled ice cream cups.", 40, 20, "https://myfoodstory.com/wp-content/uploads/2025/05/Healthy-Chocobar-1.jpg");
		ensureProduct(dBlock, "Biscuits", "Biscuits & Snacks", "Popular packaged biscuit options.", 20, 40, "https://static.toiimg.com/thumb/62403305.cms?imgsize=566439&width=800&height=800");
		ensureProduct(dBlock, "Snacks", "Biscuits & Snacks", "Assorted chips and savory snacks.", 20, 45, "https://m.media-amazon.com/images/I/71gKmrEYnoL._AC_UF894,1000_QL80_.jpg");
		ensureProduct(dBlock, "Chocolates", "Chocolates", "Assorted chocolate bars.", 30, 35, "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=800&q=80");

		ensureProduct(iBlock, "Egg Puff", "Fast Food", "Fresh egg puff from I Block bakery counter.", 25, 20, "https://www.yummyntasty.com/wp-content/uploads/2015/03/egg-puffs.jpg");
		ensureProduct(iBlock, "Veg Puff", "Fast Food", "Vegetable puff with crisp flaky layers.", 20, 25, "https://floursandfrostings.com/wp-content/uploads/2018/03/IMG_20180306_084523_451.jpg");
		ensureProduct(iBlock, "Samosa", "Fast Food", "Classic hot samosa with spiced potato filling.", 15, 30, "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSrSow8wiUuIxjfEToV69JWVUKXnNmisjibteHRz3SiFsXMpPswQFhS9QQ&s=10");
		ensureProduct(iBlock, "Frankie", "Fast Food", "Soft roll with fresh filling and sauces.", 45, 18, "https://www.spiceupthecurry.com/wp-content/uploads/2019/09/frankie-recipe-2-1.jpg");
		ensureProduct(iBlock, "Ice Creams", "Ice Creams", "Assorted chilled ice cream cups.", 40, 20, "https://myfoodstory.com/wp-content/uploads/2025/05/Healthy-Chocobar-1.jpg");
		ensureProduct(iBlock, "Biscuits", "Biscuits & Snacks", "Packaged biscuit options.", 20, 40, "https://static.toiimg.com/thumb/62403305.cms?imgsize=566439&width=800&height=800");
		ensureProduct(iBlock, "Snacks", "Biscuits & Snacks", "Assorted chips and namkeen.", 20, 45, "https://m.media-amazon.com/images/I/71gKmrEYnoL._AC_UF894,1000_QL80_.jpg");
		ensureProduct(iBlock, "Kurkure", "Biscuits & Snacks", "Crunchy masala munch snack pack.", 20, 35, "https://m.media-amazon.com/images/I/81EhmuRbGQL._AC_UF894,1000_QL80_.jpg");
		ensureProduct(iBlock, "Chocolates", "Chocolates", "Assorted chocolate bars.", 30, 35, "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=800&q=80");
		ensureProduct(iBlock, "Brownie", "Bakery", "Soft chocolate brownie square.", 55, 18, "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80");
		ensureProduct(iBlock, "Biryani", "Meals", "Campus biryani box with raita.", 120, 20, "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80");
		ensureProduct(iBlock, "Tiffins", "Tiffins", "Daily tiffin specials from I Block.", 45, 25, "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80");
		ensureProduct(iBlock, "Juices", "Beverages", "Fresh chilled fruit juices.", 45, 24, "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80");

		ensureProduct(readers, "Records", "Stationery", "Lab record books and ruled records.", 60, 40, "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80");
		ensureProduct(readers, "Pens", "Stationery", "Blue and black writing pens.", 10, 100, "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=800&q=80");
		ensureProduct(readers, "Pencils", "Stationery", "Graphite pencils for classwork and drawing.", 8, 80, "https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?auto=format&fit=crop&w=800&q=80");
		ensureProduct(readers, "Erasers", "Stationery", "Soft dust-free erasers.", 5, 80, "https://www.quickpantry.in/cdn/shop/products/apsara-non-dust-eraser-quick-pantry-2.jpg?v=1710538919");
		ensureProduct(readers, "Other Stationery Items", "Stationery", "Scale, sharpener, sticky notes and exam essentials.", 30, 50, "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80");
		ensureProduct(readers, "Chocolates", "Chocolates", "Assorted chocolate bars.", 30, 35, "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=800&q=80");
		ensureProduct(readers, "Biscuits", "Biscuits", "Packaged biscuits for quick breaks.", 20, 40, "https://static.toiimg.com/thumb/62403305.cms?imgsize=566439&width=800&height=800");
		ensureProduct(readers, "Chips", "Chips", "Assorted chips and wafers.", 20, 35, "https://instamart-media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto/NI_CATALOG/IMAGES/ciw/2026/7/11/cf27c98a-e946-4220-a28d-ff57f0e5c6f9_1.UCplainsalted_primary_MN_f63902c8-9e2b-41a6-b714-1df3149b4255.jpg");

		Set<String> oldDemoShops = Set.of("Campus Canteen", "Library Cafe");
		Set<Long> oldDemoShopIds = new HashSet<>();
		shopRepository.findAll().stream()
				.filter(shop -> oldDemoShops.contains(shop.getName()))
				.forEach(shop -> {
					oldDemoShopIds.add(shop.getId());
					shop.setActive(false);
					shopRepository.save(shop);
				});
		productRepository.findAll().stream()
				.filter(product -> product.getShop() != null && oldDemoShopIds.contains(product.getShop().getId()))
				.forEach(product -> {
					product.setActive(false);
					productRepository.save(product);
				});
	}

	private void requireDemoPasswords() {
		if (demoAdminPassword == null || demoAdminPassword.length() < 12
				|| demoStudentPassword == null || demoStudentPassword.length() < 12
				|| demoAgentPassword == null || demoAgentPassword.length() < 12) {
			throw new IllegalStateException("Demo seeding requires DEMO_ADMIN_PASSWORD, DEMO_STUDENT_PASSWORD, and DEMO_AGENT_PASSWORD with at least 12 characters.");
		}
	}

	private Shop ensureShop(String name, String category, String description, String location, String imageUrl, int preparationTime, double rating) {
		Shop shop = shopRepository.findAll().stream()
				.filter(s -> s.getName().equalsIgnoreCase(name))
				.findFirst()
				.orElseGet(() -> Shop.builder().name(name).build());
		shop.setCategory(category);
		shop.setDescription(description);
		shop.setLocation(location);
		shop.setImageUrl(imageUrl);
		shop.setPreparationTime(preparationTime);
		shop.setRating(rating);
		shop.setOpen(true);
		shop.setActive(true);
		return shopRepository.save(shop);
	}

	private void ensureProduct(Shop shop, String name, String category, String description, int price, int stock, String imageUrl) {
		Product product = productRepository.findAll().stream()
				.filter(p -> p.getShop() != null
						&& p.getShop().getId().equals(shop.getId())
						&& p.getName().equalsIgnoreCase(name))
				.findFirst()
				.orElseGet(() -> Product.builder().shop(shop).name(name).build());
		product.setShop(shop);
		product.setCategory(category);
		product.setDescription(description);
		product.setPrice(java.math.BigDecimal.valueOf(price));
		product.setStock(stock);
		product.setAvailable(stock > 0);
		product.setActive(true);
		product.setImageUrl(imageUrl);
		productRepository.save(product);
	}
}
